const db = require('../config/db');
const { success, error } = require('../utils/response');

// POST /api/pi/verify
// Pi calls this to check if a BLE token is valid for a door
const verifyAccess = async (req, res, next) => {
  try {
    const { token_hash, door_id } = req.body;
    if (!token_hash || !door_id)
      return error(res, 'token_hash and door_id are required', 400);

    // 1. Validate BLE token
    const [tokenRows] = await db.query(
      `SELECT bt.token_id, bt.user_id
       FROM ble_tokens bt
       WHERE bt.token_hash = ?
         AND bt.is_active = 1
         AND (bt.expires_at IS NULL OR bt.expires_at > NOW())`,
      [token_hash]
    );

    if (!tokenRows.length)
      return success(res, { granted: false, reason: 'INVALID_TOKEN' });

    const { user_id, token_id } = tokenRows[0];

    // 2. Check door access rule for this user's role
    const [ruleRows] = await db.query(
      `SELECT dar.rule_id FROM door_access_rules dar
       JOIN users u ON u.role_id = dar.role_id
       WHERE u.user_id = ? AND dar.door_id = ?
         AND (dar.allowed_from IS NULL OR TIME(NOW()) >= dar.allowed_from)
         AND (dar.allowed_until IS NULL OR TIME(NOW()) <= dar.allowed_until)`,
      [user_id, door_id]
    );

    if (!ruleRows.length)
      return success(res, { granted: false, reason: 'NO_ACCESS_RULE', token_id, user_id });

    // 3. Check if door requires face auth
    const [doorRows] = await db.query(
      `SELECT requires_face_auth FROM doors WHERE door_id = ?`,
      [door_id]
    );

    const requiresFace = doorRows[0]?.requires_face_auth === 1;

    return success(res, {
      granted:           !requiresFace, // if face required, not granted yet
      requires_face_auth: requiresFace,
      user_id,
      token_id,
    });

  } catch (err) { next(err); }
};

// POST /api/pi/log
// Pi calls this after every access attempt to record it
const logAccessAttempt = async (req, res, next) => {
  try {
    const {
      user_id, door_id, result, method,
      ble_token_id, device_info,
      face_auth_result, face_confidence, fallback_used
    } = req.body;

    await db.query(
      `INSERT INTO access_logs
        (user_id, door_id, result, method, ble_token_id, device_info,
         face_auth_result, face_confidence, fallback_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, door_id, result, method, ble_token_id, device_info,
        face_auth_result || 'SKIPPED', face_confidence || null, fallback_used || 0
      ]
    );

    // Auto attendance — if result is GRANTED, upsert attendance check-in/out
    if (result === 'GRANTED' && user_id) {
      const [openSession] = await db.query(
        `SELECT attendance_id FROM attendance
         WHERE user_id = ? AND check_out IS NULL
         ORDER BY check_in DESC LIMIT 1`,
        [user_id]
      );

      if (openSession.length) {
        // Check out
        await db.query(
          `UPDATE attendance
           SET check_out = NOW(),
               total_hours = ROUND(TIMESTAMPDIFF(MINUTE, check_in, NOW()) / 60.0, 2)
           WHERE attendance_id = ?`,
          [openSession[0].attendance_id]
        );
      } else {
        // Check in
        await db.query(
          `INSERT INTO attendance (user_id, door_id, check_in) VALUES (?, ?, NOW())`,
          [user_id, door_id]
        );
      }
    }

    return success(res, {}, 'Access logged');
  } catch (err) { next(err); }
};

// GET /api/pi/sync/:doorId
// Pi calls this on boot or reconnect to get fresh data
const syncDoorData = async (req, res, next) => {
  try {
    const { door_id } = req.params;

    // Door config
    const [door] = await db.query(
      `SELECT * FROM doors WHERE door_id = ?`, [door_id]
    );

    // All active BLE tokens for users who have access to this door
    const [tokens] = await db.query(
      `SELECT bt.token_hash, bt.user_id, bt.expires_at
       FROM ble_tokens bt
       JOIN users u ON bt.user_id = u.user_id
       JOIN door_access_rules dar ON dar.role_id = u.role_id
       WHERE dar.door_id = ? AND bt.is_active = 1 AND u.status = 1`,
      [door_id]
    );

    // Face embeddings for users with access
    const [embeddings] = await db.query(
      `SELECT fp.user_id, fp.embedding
       FROM face_profiles fp
       JOIN users u ON fp.user_id = u.user_id
       JOIN door_access_rules dar ON dar.role_id = u.role_id
       WHERE dar.door_id = ? AND fp.is_active = 1 AND u.status = 1`,
      [door_id]
    );

    return success(res, {
      door:       door[0] || null,
      tokens,
      embeddings: embeddings.map(e => ({
        user_id:   e.user_id,
        embedding: e.embedding.toString('base64'),
      })),
    });

  } catch (err) { next(err); }
};

// POST /api/pi/door-access-request
// ESP calls this when user presses button on door
// Handles the complete flow: verify access + face auth (if needed) + unlock
const handleDoorAccessRequest = async (req, res, next) => {
  try {
    const {
      door_id,
      user_id,        // User ID detected from request (optional, can be null)
      face_data,      // Either: { type: 'embedding_test', embedding: '...' }
                      //    or: { type: 'camera_image', image_base64: '...' }
      test_mode       // Boolean: true for testing with default embedding
    } = req.body;

    if (!door_id) {
      return error(res, 'door_id is required', 400);
    }

    console.log(`\n🚪 [Door Access Request] Door: ${door_id}, User: ${user_id}, Test Mode: ${test_mode}`);

    // 1. Get door config
    const [doorRows] = await db.query(
      `SELECT door_id, door_name, requires_face_auth FROM doors WHERE door_id = ?`,
      [door_id]
    );

    if (!doorRows.length) {
      return error(res, 'Door not found', 404);
    }

    const door = doorRows[0];
    const requiresFace = door.requires_face_auth === 1;
    const requestId = `esp_${door_id}_${Date.now()}`;

    console.log(`   Door: ${door.door_name}, Requires Face: ${requiresFace}`);

    // 2. If face auth required, process face data
    let faceResult = { authorized: !requiresFace };

    if (requiresFace) {
      if (!face_data) {
        return error(res, 'Face data required for this door. Provide face_data with embedding or camera image', 400);
      }

      try {
        if (face_data.type === 'embedding_test') {
          // Scenario 1: Test embedding (no camera)
          console.log('   🧪 Using test embedding flow...');
          
          faceResult = await verifyEmbedding(
            face_data.embedding,
            door_id,
            user_id
          );

        } else if (face_data.type === 'camera_image') {
          // Scenario 2: Camera image from ESP
          console.log('   📷 Using camera image flow...');
          
          faceResult = await verifyCameraImage(
            face_data.image_base64,
            door_id,
            user_id
          );

        } else {
          return error(res, 'Invalid face_data.type. Use "embedding_test" or "camera_image"', 400);
        }

        if (!faceResult.authorized) {
          console.log(`   ❌ Face auth failed: ${faceResult.reason}`);
          
          // Log the failed attempt
          await db.query(
            `INSERT INTO access_logs
              (door_id, result, method, face_auth_result, face_confidence, device_info)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [door_id, 'DENIED', 'FACE_ESP', 'FAILED', faceResult.confidence || 0, 'ESP32_DOOR_CONTROLLER']
          );

          return success(res, {
            granted: false,
            reason: 'FACE_AUTH_FAILED',
            message: faceResult.reason,
            similarity: faceResult.similarity,
            confidence: faceResult.confidence
          });
        }

      } catch (err) {
        console.error(`   ❌ Face verification error: ${err.message}`);
        return error(res, `Face verification failed: ${err.message}`, 400);
      }
    }

    console.log(`   ✅ Authorization granted`);

    // 3. Log successful access
    await db.query(
      `INSERT INTO access_logs
        (user_id, door_id, result, method, face_auth_result, device_info)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id || null, door_id, 'GRANTED', 'FACE_ESP', requiresFace ? 'PASSED' : 'SKIPPED', 'ESP32_DOOR_CONTROLLER']
    );

    // 4. Send MQTT unlock command
    const mqttPublish = require('../controllers/mqtt.controller').publishUnlockCommand;
    const mqttResult = await mqttPublish(door_id, user_id || 0, requestId);

    console.log(`   🔓 Door unlock command sent via MQTT: ${mqttResult}`);

    return success(res, {
      granted: true,
      message: 'Access granted',
      door_id,
      door_name: door.door_name,
      user_id: faceResult.user_id || user_id,
      similarity: faceResult.similarity,
      mqtt_sent: mqttResult
    });

  } catch (err) { 
    console.error('Error in handleDoorAccessRequest:', err);
    next(err); 
  }
};

/**
 * Verify embedding directly (Scenario 1: Test embedding without camera)
 */
const verifyEmbedding = async (testEmbedding, doorId, userId) => {
  try {
    // If userId provided, verify against that user's embeddings
    if (userId) {
      console.log(`     → Verifying against user ${userId}`);
      
      const [embeddings] = await db.query(
        `SELECT embedding FROM face_embeddings WHERE user_id = ? LIMIT 1`,
        [userId]
      );

      if (!embeddings.length) {
        return {
          authorized: false,
          reason: 'User has no enrolled face',
          similarity: 0,
          confidence: 0
        };
      }

      // Compare embeddings (simple cosine similarity)
      const storedEmbedding = Buffer.from(embeddings[0].embedding).toString('base64');
      const similarity = calculateEmbeddingSimilarity(testEmbedding, storedEmbedding);

      const THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.6');
      const authorized = similarity >= THRESHOLD;

      console.log(`     → Similarity: ${similarity.toFixed(3)}, Threshold: ${THRESHOLD}`);

      return {
        authorized,
        user_id: userId,
        similarity,
        confidence: similarity,
        reason: authorized ? 'Match' : 'Below threshold'
      };
    }

    // If no userId, search against all embeddings for this door's authorized users
    console.log(`     → Searching against all authorized users`);

    const [embeddings] = await db.query(
      `SELECT fp.user_id, fp.embedding
       FROM face_embeddings fp
       JOIN users u ON fp.user_id = u.user_id
       JOIN door_access_rules dar ON dar.role_id = u.role_id
       WHERE dar.door_id = ? AND fp.is_active = 1 AND u.status = 1
       LIMIT 20`,
      [doorId]
    );

    if (!embeddings.length) {
      return {
        authorized: false,
        reason: 'No authorized faces for this door',
        similarity: 0
      };
    }

    let bestMatch = null;
    let bestSimilarity = 0;
    const THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.6');

    for (const row of embeddings) {
      const storedEmbedding = Buffer.from(row.embedding).toString('base64');
      const similarity = calculateEmbeddingSimilarity(testEmbedding, storedEmbedding);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = row.user_id;
      }
    }

    const authorized = bestSimilarity >= THRESHOLD;

    console.log(`     → Best match: User ${bestMatch}, Similarity: ${bestSimilarity.toFixed(3)}`);

    return {
      authorized,
      user_id: bestMatch,
      similarity: bestSimilarity,
      confidence: bestSimilarity,
      reason: authorized ? 'Match' : 'Below threshold'
    };

  } catch (err) {
    throw new Error(`Embedding verification failed: ${err.message}`);
  }
};

/**
 * Verify camera image (Scenario 2: Camera image from ESP)
 */
const verifyCameraImage = async (imageBase64, doorId, userId) => {
  try {
    const axios = require('axios');

    // Call the microservice to recognize the face
    const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5000';
    const FACE_SERVICE_API_KEY = process.env.FACE_SERVICE_API_KEY || 'your-secret-key';

    console.log(`     → Calling face recognition microservice...`);

    const response = await axios.post(
      `${FACE_SERVICE_URL}/recognize`,
      { image_base64: imageBase64 },
      {
        headers: {
          'X-API-Key': FACE_SERVICE_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    if (!response.data.success) {
      return {
        authorized: false,
        reason: response.data.error || 'Face recognition failed',
        similarity: 0
      };
    }

    const { user_id, similarity, is_authorized } = response.data.data;

    console.log(`     → Recognition result: User ${user_id}, Similarity: ${similarity}, Authorized: ${is_authorized}`);

    return {
      authorized: is_authorized,
      user_id,
      similarity,
      confidence: similarity,
      reason: is_authorized ? 'Recognized' : 'Not recognized'
    };

  } catch (err) {
    throw new Error(`Camera image verification failed: ${err.message}`);
  }
};

/**
 * Calculate cosine similarity between two embeddings
 */
const calculateEmbeddingSimilarity = (embedding1Base64, embedding2Base64) => {
  try {
    // Decode base64 embeddings
    const buf1 = Buffer.from(embedding1Base64, 'base64');
    const buf2 = Buffer.from(embedding2Base64, 'base64');

    // Convert to Float32Arrays
    const emb1 = new Float32Array(buf1.buffer, buf1.byteOffset, buf1.byteLength / 4);
    const emb2 = new Float32Array(buf2.buffer, buf2.byteOffset, buf2.byteLength / 4);

    if (emb1.length !== emb2.length) {
      console.warn('Embedding dimension mismatch:', emb1.length, 'vs', emb2.length);
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < emb1.length; i++) {
      dotProduct += emb1[i] * emb2[i];
      norm1 += emb1[i] * emb1[i];
      norm2 += emb2[i] * emb2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  } catch (err) {
    console.error('Error calculating similarity:', err);
    return 0;
  }
};

module.exports = { 
  verifyAccess, 
  logAccessAttempt, 
  syncDoorData, 
  handleDoorAccessRequest,
  verifyEmbedding,
  verifyCameraImage
};
