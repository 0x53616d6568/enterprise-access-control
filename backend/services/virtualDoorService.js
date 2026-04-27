/**
 * Virtual Door Service
 * Simulates a physical door connected to MQTT for testing
 * Can be controlled via MQTT web client or REST API
 */

const db = require('../config/db');
const mqtt = require('mqtt');

let mqttClient = null;
let virtualDoorState = {
  door_1: { status: 'CLOSED', locked: true, last_action: null, last_action_time: null }
};

/**
 * Initialize virtual door MQTT connection
 */
const initializeVirtualDoor = async () => {
  try {
    // Connect to HiveMQ Cloud as a "door device"
    // Uses SSL/TLS on port 8883
    const brokerUrl = process.env.MQTT_BROKER || 'mqtts://bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud:8883';
    
    mqttClient = mqtt.connect(brokerUrl, {
      username: process.env.MQTT_USER || 'sameh',
      password: process.env.MQTT_PASSWORD || 'Samehsameh1020',
      clientId: `virtual-door-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      rejectUnauthorized: false  // For development/testing
    });

    mqttClient.on('connect', () => {
      console.log('✅ Virtual door connected to MQTT');
      
      // Subscribe to unlock commands
      mqttClient.subscribe('door/unlock', (err) => {
        if (err) console.error('Failed to subscribe:', err);
        else console.log('📡 Subscribed to door/unlock');
      });

      // Publish initial status
      publishDoorStatus();
    });

    mqttClient.on('message', (topic, message) => {
      console.log(`📨 Virtual door received on ${topic}:`, message.toString());
      
      if (topic === 'door/unlock') {
        try {
          const data = JSON.parse(message.toString());
          handleUnlockRequest(data);
        } catch (e) {
          console.error('Failed to parse unlock message:', e.message);
        }
      }
    });

    mqttClient.on('error', (err) => {
      console.error('❌ Virtual door MQTT error:', err.message);
    });

  } catch (err) {
    console.error('Failed to initialize virtual door:', err.message);
  }
};

/**
 * Handle unlock request from MQTT
 */
const handleUnlockRequest = async (data) => {
  try {
    const { door_id, user_id, request_id } = data;
    
    console.log(`🔓 Unlock request for door ${door_id} from user ${user_id}`);

    // Simulate door unlock (3 seconds)
    virtualDoorState.door_1.status = 'OPEN';
    virtualDoorState.door_1.locked = false;
    virtualDoorState.door_1.last_action = 'UNLOCK';
    virtualDoorState.door_1.last_action_time = new Date();

    // Publish door state change
    publishDoorStatus();

    // Simulate door re-locking after 3 seconds
    setTimeout(() => {
      virtualDoorState.door_1.status = 'CLOSED';
      virtualDoorState.door_1.locked = true;
      publishDoorStatus();
      console.log('🔒 Virtual door auto-locked');
    }, 3000);

    // Log access attempt
    await logAccessAttempt(door_id, user_id, 'GRANTED', 'VIRTUAL_DOOR');

  } catch (err) {
    console.error('Error handling unlock request:', err.message);
  }
};

/**
 * Publish current door status to MQTT
 */
const publishDoorStatus = () => {
  if (!mqttClient) return;

  const statusMessage = {
    door_id: 'VIRTUAL_DOOR_1',
    status: virtualDoorState.door_1.status,
    locked: virtualDoorState.door_1.locked,
    timestamp: new Date().toISOString(),
    last_action: virtualDoorState.door_1.last_action,
    last_action_time: virtualDoorState.door_1.last_action_time
  };

  mqttClient.publish('door/status', JSON.stringify(statusMessage), { retain: true });
  console.log('📤 Published door status:', statusMessage);
};

/**
 * Get virtual door state
 */
const getVirtualDoorState = () => {
  return {
    ...virtualDoorState.door_1,
    door_id: 'VIRTUAL_DOOR_1',
    door_name: 'Virtual Test Door',
    location: 'Lab / Development',
    connected: mqttClient && mqttClient.connected
  };
};

/**
 * Manually trigger unlock via REST API (for web client control)
 */
const triggerUnlockViaAPI = async (userId, userName) => {
  try {
    console.log(`🔓 API Unlock triggered by ${userName}`);
    
    // Simulate unlock
    virtualDoorState.door_1.status = 'OPEN';
    virtualDoorState.door_1.locked = false;
    virtualDoorState.door_1.last_action = 'API_UNLOCK';
    virtualDoorState.door_1.last_action_time = new Date();

    publishDoorStatus();

    // Auto-lock after 3 seconds
    setTimeout(() => {
      virtualDoorState.door_1.status = 'CLOSED';
      virtualDoorState.door_1.locked = true;
      publishDoorStatus();
    }, 3000);

    // Log the action
    await logAccessAttempt(1, userId, 'GRANTED', 'API');

    return {
      success: true,
      message: 'Virtual door unlocked',
      duration: 3000
    };

  } catch (err) {
    console.error('Error triggering unlock:', err.message);
    throw err;
  }
};

/**
 * Log access attempt
 */
const logAccessAttempt = async (doorId, userId, result, method) => {
  try {
    await db.query(
      `INSERT INTO access_logs (door_id, user_id, access_result, method, device_info, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [doorId, userId, result, method, 'Virtual Door System']
    );
  } catch (err) {
    console.error('Error logging access:', err.message);
  }
};

module.exports = {
  initializeVirtualDoor,
  getVirtualDoorState,
  triggerUnlockViaAPI,
  publishDoorStatus
};
