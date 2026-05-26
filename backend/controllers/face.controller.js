const db = require('../config/db');
const axios = require('axios');
const { success, error } = require('../utils/response');

// Face Microservice Configuration
const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5000';
const FACE_SERVICE_API_KEY = process.env.FACE_SERVICE_API_KEY || 'your-secret-key-change-in-production';

/**
 * Call Face Recognition Microservice
 * Handles connection errors gracefully
 */
const callFaceService = async (endpoint, method = 'POST', data = null) => {
  try {
    console.log(`🔗 Calling microservice: ${method} ${FACE_SERVICE_URL}${endpoint}`);
    
    const config = {
      method,
      url: `${FACE_SERVICE_URL}${endpoint}`,
      headers: {
        'X-API-Key': FACE_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // Increased to 2 minutes for face detection
      maxContentLength: 100 * 1024 * 1024, // 100MB for large base64 images
    };

    if (data) {
      const dataSize = JSON.stringify(data).length;
      console.log(`📤 Request size: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
      if (data.image_base64) {
        console.log(`📷 Image base64 length: ${data.image_base64.length} chars`);
      }
      config.data = data;
    }

    const response = await axios(config);
    console.log(`✅ Microservice response received (status: ${response.status})`);
    console.log(`   Response success: ${response.data?.success}`);
    if (!response.data?.success) {
      console.warn(`⚠️  Microservice returned success=false: ${response.data?.error}`);
    }
    return response.data;
  } catch (err) {
    console.error(`❌ Face Service Error (${endpoint}):`, err.message);
    console.error(`   Code: ${err.code}`);
    console.error(`   URL: ${FACE_SERVICE_URL}${endpoint}`);
    
    // Log response details if available
    if (err.response) {
      console.error(`   Status: ${err.response.status}`);
      console.error(`   Response data:`, JSON.stringify(err.response.data, null, 2));
    }
    
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Microservice connection refused. Is it running on ' + FACE_SERVICE_URL + '?');
    }
    if (err.code === 'ETIMEDOUT') {
      throw new Error('Face processing timed out (>2 minutes). Image may be too large or face detection too slow.');
    }
    
    throw new Error(
      err.response?.data?.error || 
      `Face recognition service unavailable: ${err.message}`
    );
  }
};

// POST /api/face/enroll - Enroll a user's face
// Expected: { user_id, image_base64, model_version }
// The microservice handles embedding extraction
// Now supports multiple embeddings per user
const enrollFace = async (req, res, next) => {
  try {
    const { user_id, image_base64, model_version = 'arcface-r100' } = req.body;

    console.log(`[FACE ENROLL] Starting enrollment for user ${user_id}`);

    if (!user_id || !image_base64) {
      console.warn(`[FACE ENROLL] Missing required fields: user_id=${!!user_id}, image_base64=${!!image_base64}`);
      return error(res, 'user_id and image_base64 are required', 400);
    }

    console.log(`[FACE ENROLL] Image base64 length: ${image_base64.length} chars`);

    // Verify user exists
    const [userCheck] = await db.query(
      'SELECT user_id FROM users WHERE user_id = ?',
      [user_id]
    );
    if (!userCheck.length) {
      console.warn(`[FACE ENROLL] User ${user_id} not found in database`);
      return error(res, 'User not found', 404);
    }

    console.log(`[FACE ENROLL] User ${user_id} verified in database`);
    console.log(`[FACE ENROLL] Calling microservice to extract embedding...`);

    // Call microservice to extract embedding
    const faceServiceResult = await callFaceService('/enroll', 'POST', {
      user_id,
      image_base64,
    });

    console.log(`[FACE ENROLL] Microservice result:`, {
      success: faceServiceResult.success,
      hasData: !!faceServiceResult.data,
      error: faceServiceResult.error,
    });

    if (!faceServiceResult.success) {
      const errorMsg = faceServiceResult.error || 'Face recognition failed';
      console.error(`[FACE ENROLL] Microservice returned error: ${errorMsg}`);
      return error(res, errorMsg, 400);
    }

    const { embedding } = faceServiceResult.data;

    if (!embedding) {
      console.error(`[FACE ENROLL] Microservice returned success but no embedding in data`);
      return error(res, 'No embedding returned from microservice', 500);
    }

    console.log(`[FACE ENROLL] Embedding received (${embedding.length} chars)`);

    // INSERT new embedding (supports multiple embeddings per user)
    const [insertResult] = await db.query(
      `INSERT INTO face_embeddings (user_id, embedding, model_version, enrolled_at)
       VALUES (?, ?, ?, NOW())`,
      [user_id, Buffer.from(embedding, 'base64'), model_version]
    );

    // Count total embeddings for this user
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM face_embeddings WHERE user_id = ?',
      [user_id]
    );

    console.log(`[FACE ENROLL] ✅ Successfully enrolled face for user ${user_id} (embedding ID: ${insertResult.insertId}, total: ${countResult[0].total})`);

    return success(res, { 
      user_id, 
      embedding_id: insertResult.insertId,
      total_embeddings: countResult[0].total,
      enrolled_at: new Date(), 
      message: `Face enrolled successfully (${countResult[0].total} total)`
    }, 'Face profile updated', 201);

  } catch (err) { 
    console.error(`[FACE ENROLL] ❌ Unexpected error:`, err.message);
    console.error(`[FACE ENROLL] Stack:`, err.stack);
    next(err); 
  }
};

// GET /api/face/:user_id - Get user's face embeddings (all of them)
// Returns: { user_id, embeddings: [{ id, enrolled_at, model_version, embedding_base64 }, ...], total_count }
const getFaceEmbedding = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.query(
      `SELECT id, user_id, embedding, enrolled_at, model_version
       FROM face_embeddings
       WHERE user_id = ?
       ORDER BY enrolled_at DESC`,
      [user_id]
    );

    if (!rows.length) {
      return error(res, 'No face profile found for this user', 404);
    }

    // Convert all embeddings BLOB to base64
    const embeddings = rows.map(row => ({
      id: row.id,
      enrolled_at: row.enrolled_at,
      model_version: row.model_version,
      embedding: row.embedding.toString('base64'), // Base64 for response
    }));

    return success(res, {
      user_id: rows[0].user_id,
      embeddings,
      total_count: rows.length,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/face/recognize - Recognize face in image
// Expected: { image_base64 }
// Returns: { user_id, similarity, is_authorized }
const recognizeFace = async (req, res, next) => {
  try {
    const { image_base64 } = req.body;

    if (!image_base64) {
      return error(res, 'image_base64 is required', 400);
    }

    // Call microservice to recognize face
    const faceServiceResult = await callFaceService('/recognize', 'POST', {
      image_base64,
    });

    if (!faceServiceResult.success) {
      return error(res, faceServiceResult.error || 'Face recognition failed', 400);
    }

    const { user_id, similarity, is_authorized, threshold } = faceServiceResult.data;

    return success(res, {
      user_id,
      similarity,
      is_authorized,
      threshold,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/face/batch - Get multiple face embeddings (for comparison)
// Expected: { user_ids: [1, 2, 3] }
const getBatchFaceEmbeddings = async (req, res, next) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return error(res, 'user_ids array is required and cannot be empty', 400);
    }

    const placeholders = user_ids.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT user_id, embedding, enrolled_at, model_version
       FROM face_embeddings
       WHERE user_id IN (${placeholders})`,
      user_ids
    );

    // Convert BLOB to base64
    const results = rows.map(row => ({
      user_id: row.user_id,
      embedding: row.embedding.toString('base64'),
      enrolled_at: row.enrolled_at,
      model_version: row.model_version,
    }));

    return success(res, results);
  } catch (err) {
    next(err);
  }
};

// GET /api/face/status/:user_id - Check face enrollment status
// Returns: { user_id, enrolled, count, last_enrolled_at, details }
const getFaceEnrollmentStatus = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.query(
      `SELECT id, enrolled_at, model_version
       FROM face_embeddings
       WHERE user_id = ?
       ORDER BY enrolled_at DESC`,
      [user_id]
    );

    const enrolled = rows.length > 0;

    return success(res, {
      user_id,
      enrolled,
      count: rows.length,
      ...(enrolled && {
        last_enrolled_at: rows[0].enrolled_at,
        model_version: rows[0].model_version,
        enrollment_ids: rows.map(r => r.id),
      }),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/face/:user_id - Delete all face embeddings for a user
// Or: DELETE /api/face/:user_id?embedding_id=123 - Delete specific embedding
const deleteFaceProfile = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { embedding_id } = req.query;

    // Verify user exists
    const [userCheck] = await db.query(
      'SELECT user_id FROM users WHERE user_id = ?',
      [user_id]
    );
    if (!userCheck.length) {
      return error(res, 'User not found', 404);
    }

    let query, params;
    if (embedding_id) {
      // Delete specific embedding
      query = 'DELETE FROM face_embeddings WHERE user_id = ? AND id = ?';
      params = [user_id, embedding_id];
    } else {
      // Delete all embeddings for user
      query = 'DELETE FROM face_embeddings WHERE user_id = ?';
      params = [user_id];
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return error(res, 'No embeddings found to delete', 404);
    }

    return success(res, {
      user_id,
      deleted_count: result.affectedRows,
      message: `Deleted ${result.affectedRows} face embedding(s)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  enrollFace,
  getFaceEmbedding,
  deleteFaceProfile,
  getBatchFaceEmbeddings,
  getFaceEnrollmentStatus,
  recognizeFace,
};
