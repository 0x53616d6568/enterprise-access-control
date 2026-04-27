const db = require('../config/db');
const { success, error } = require('../utils/response');
const mqtt = require('mqtt');

// Shared MQTT client for publishing access requests
let mqttAccessClient = null;
let mqttClientReady = false;

/**
 * Get or create MQTT client for publishing access requests
 */
const getMQTTClient = () => {
  if (mqttAccessClient) {
    return mqttAccessClient;
  }

  // Create new client
  const brokerUrl = process.env.MQTT_BROKER || 'mqtts://bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud:8883';
  
  console.log(`[MQTT] Connecting to broker: ${brokerUrl.replace(/:.*/, ':****')}`);
  
  mqttAccessClient = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USER || 'sameh',
    password: process.env.MQTT_PASSWORD || 'Samehsameh1020',
    clientId: `access-request-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    rejectUnauthorized: false,
    connectTimeout: 10000
  });

  mqttAccessClient.on('connect', () => {
    console.log('✅ [MQTT] Request MQTT client connected and ready');
    mqttClientReady = true;
  });

  mqttAccessClient.on('reconnect', () => {
    console.log('🔄 [MQTT] Request MQTT client reconnecting...');
    mqttClientReady = false;
  });

  mqttAccessClient.on('error', (err) => {
    console.error('❌ [MQTT] Request MQTT error:', err.message);
    mqttClientReady = false;
  });

  mqttAccessClient.on('disconnect', () => {
    console.log('⚠️  [MQTT] Request MQTT disconnected');
    mqttClientReady = false;
  });

  return mqttAccessClient;
};

/**
 * Publish access request to MQTT with retry logic
 */
const publishAccessRequest = async (door_id, requestData) => {
  return new Promise((resolve) => {
    try {
      const topic = `doors/${door_id}/access/request`;
      const payload = JSON.stringify(requestData);
      
      console.log(`[MQTT] Publishing to topic: ${topic}`);
      console.log(`[MQTT] Payload:`, payload);
      
      const mqttClient = getMQTTClient();
      
      // If not connected, try to publish anyway (mqtt library buffers it)
      mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          console.error(`❌ [MQTT] Failed to publish to ${topic}:`, err.message);
          resolve(false);
        } else {
          console.log(`✅ [MQTT] Successfully published access request to ${topic}`);
          resolve(true);
        }
      });
      
    } catch (err) {
      console.error('[MQTT] Publish error:', err.message);
      resolve(false);
    }
  });
};

const getMyRequests = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name AS reviewed_by_name
       FROM requests r
       LEFT JOIN users u ON r.reviewed_by = u.user_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      [req.user.user_id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getAllRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const [rows] = await db.query(
      `SELECT r.*, u.full_name, u.department,
              rev.full_name AS reviewed_by_name
       FROM requests r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN users rev ON r.reviewed_by = rev.user_id
       ${status ? 'WHERE r.status = ?' : ''}
       ORDER BY r.created_at DESC`,
      status ? [status] : []
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const createRequest = async (req, res, next) => {
  try {
    const { type, description } = req.body;
    if (!type) return error(res, 'Request type is required', 400);
    
    // Create request record
    const [result] = await db.query(
      `INSERT INTO requests (user_id, type, description) VALUES (?, ?, ?)`,
      [req.user.user_id, type, description || '']
    );
    
    return success(res, { request_id: result.insertId }, 'Request submitted', 201);
  } catch (err) { next(err); }
};

const reviewRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status))
      return error(res, 'Status must be APPROVED or REJECTED', 400);
    await db.query(
      `UPDATE requests SET status = ?, reviewed_by = ? WHERE request_id = ?`,
      [status, req.user.user_id, req.params.id]
    );

    // Fetch request to notify the user
    const [rows] = await db.query(`SELECT user_id, type FROM requests WHERE request_id = ?`, [req.params.id]);
    if (rows.length) {
      const notifType = status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED';
      const title = `Request ${status}`;
      const message = `Your ${rows[0].type} request has been ${status.toLowerCase()}.`;
      
      // Save to database
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [rows[0].user_id, title, message, notifType]
      );
    }
    return success(res, {}, `Request ${status.toLowerCase()}`);
  } catch (err) { next(err); }
};

/**
 * POST /api/requests/door-access
 * Simple door access request - employee requests access without time/day validation
 * Manager reviews request and decides whether to grant access
 * Publishes to MQTT for real-time updates
 */
const requestDoorAccess = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { door_id, door_name } = req.body;
    
    if (!door_id) return error(res, 'door_id is required', 400);
    
    // Check door exists and get user info
    const [doors] = await db.query(
      `SELECT door_id, door_name FROM doors WHERE door_id = ?`,
      [door_id]
    );
    
    if (!doors.length) {
      return error(res, 'Door not found', 404);
    }

    const [users] = await db.query(
      `SELECT user_id, full_name FROM users WHERE user_id = ?`,
      [userId]
    );
    
    // Create access request
    const description = `Access request for door: ${door_name || doors[0].door_name}`;
    const [result] = await db.query(
      `INSERT INTO requests (user_id, type, description) VALUES (?, ?, ?)`,
      [userId, 'ACCESS_REQUEST', description]
    );
    
    const requestId = result.insertId;
    const userName = users.length ? users[0].full_name : 'Unknown User';
    
    console.log(`\n[🚪 Door Access] Request ${requestId} created`);
    console.log(`   User: ${userName} (ID: ${userId})`);
    console.log(`   Door: ${door_name || doors[0].door_name} (ID: ${door_id})`);
    console.log(`   Timestamp: ${new Date().toISOString()}\n`);
    
    // Publish to MQTT for real-time updates (async, non-blocking)
    const mqttPayload = {
      request_id: requestId,
      door_id: door_id,
      door_name: door_name || doors[0].door_name,
      user_id: userId,
      user_name: userName,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    
    // Don't await - publish asynchronously
    publishAccessRequest(door_id, mqttPayload).catch(err => {
      console.error('[MQTT] Async publish error:', err.message);
    });
    
    return success(res, { request_id: requestId }, 'Access request submitted', 201);
  } catch (err) { next(err); }
};

module.exports = { getMyRequests, getAllRequests, createRequest, requestDoorAccess, reviewRequest };
