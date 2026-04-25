/**
 * Raspberry Pi MQTT Integration for Door Access
 * Handles MQTT communication for door access requests
 * 
 * This is a reference implementation for the Pi to:
 * 1. Subscribe to access request topics
 * 2. Receive user tokens and door IDs
 * 3. Verify with backend API
 * 4. Control door lock
 * 5. Publish response back to the app/backend
 */

// Requirements:
// npm install paho-mqtt axios dotenv

const mqtt = require('paho-mqtt');
const axios = require('axios');
require('dotenv').config();

class MQTTDoorController {
  constructor(config = {}) {
    this.config = {
      // LOCAL DEV: tcp://localhost:1883
      brokerUrl: process.env.MQTT_BROKER_URL || 'tcp://mqtt-broker-aiven.aivencloud.com:1883',
      clientId: process.env.MQTT_CLIENT_ID || `door-pi-${Date.now()}`,
      username: process.env.MQTT_USERNAME || 'admin',
      password: process.env.MQTT_PASSWORD || 'password',
      doorId: process.env.DOOR_ID || 'door-001',
      requestTopic: process.env.MQTT_REQUEST_TOPIC || 'doors/+/access/request',
      responseTopic: process.env.MQTT_RESPONSE_TOPIC || 'doors/door-001/access/response',
      // LOCAL DEV: http://localhost:3000/api
      backendBaseUrl: process.env.BACKEND_BASE_URL || 'https://enterprise-access-control.onrender.com/api',
      ...config
    };

    this.client = null;
    this.isConnected = false;
    this.doorLocked = true;
  }

  /**
   * Initialize MQTT connection
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.client = new mqtt.Client(
          this.config.brokerUrl,
          this.config.clientId
        );

        // Set callbacks
        this.client.onConnectionLost = (responseObject) => {
          console.error('Connection lost:', responseObject.errorMessage);
          this.isConnected = false;
        };

        this.client.onMessageArrived = (message) => {
          this.onMessageReceived(message);
        };

        // Connect options
        const options = {
          useSSL: this.config.brokerUrl.startsWith('wss://'),
          userName: this.config.username,
          password: this.config.password,
          onSuccess: () => {
            console.log('Connected to MQTT broker');
            this.isConnected = true;
            this.subscribe();
            resolve();
          },
          onFailure: (error) => {
            console.error('Connection failed:', error);
            reject(error);
          }
        };

        this.client.connect(options);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Subscribe to access request topics
   */
  subscribe() {
    try {
      // Subscribe to door-specific requests
      const doorTopic = `doors/${this.config.doorId}/access/request`;
      this.client.subscribe(doorTopic);
      console.log(`Subscribed to: ${doorTopic}`);

      // Also subscribe to broadcast requests
      this.client.subscribe('doors/+/access/request');
      console.log('Subscribed to: doors/+/access/request');
    } catch (err) {
      console.error('Subscribe error:', err);
    }
  }

  /**
   * Handle incoming MQTT messages
   */
  async onMessageReceived(message) {
    try {
      console.log(`Message received on ${message.destinationName}`);

      const payload = JSON.parse(message.payloadString);
      console.log('Payload:', payload);

      // Validate required fields
      if (!payload.requestId || !payload.tokenHash || !payload.userId) {
        console.error('Invalid payload - missing required fields');
        return;
      }

      // Process access request
      const result = await this.processAccessRequest(payload);

      // Publish response
      await this.publishResponse(payload.requestId, result);

    } catch (err) {
      console.error('Error processing message:', err);
      // Publish error response
      if (message.destinationName.includes('request')) {
        const payload = JSON.parse(message.payloadString);
        this.publishResponse(payload.requestId, {
          granted: false,
          reason: 'PROCESSING_ERROR',
          error: err.message
        });
      }
    }
  }

  /**
   * Process access request - verify with backend
   */
  async processAccessRequest(payload) {
    try {
      const { requestId, tokenHash, doorId, userId } = payload;

      // Verify with backend API
      const response = await axios.post(
        `${this.config.backendBaseUrl}/mqtt/verify`,
        {
          requestId,
          tokenHash,
          doorId: doorId || this.config.doorId
        }
      );

      if (response.data.data.granted) {
        // Unlock the door
        await this.unlockDoor();
        
        // Re-lock after delay (e.g., 5 seconds)
        setTimeout(() => this.lockDoor(), 5000);

        return {
          granted: true,
          requestId,
          doorId: doorId || this.config.doorId,
          unlockedAt: new Date().toISOString()
        };
      } else {
        return {
          granted: false,
          reason: response.data.data.reason || 'ACCESS_DENIED',
          requestId
        };
      }
    } catch (err) {
      console.error('Backend verification error:', err);
      return {
        granted: false,
        reason: 'BACKEND_ERROR',
        error: err.message
      };
    }
  }

  /**
   * Publish response to MQTT
   */
  publishResponse(requestId, result) {
    try {
      const message = new mqtt.Message(JSON.stringify(result));
      message.destinationName = `${this.config.responseTopic}/${requestId}`;
      message.qos = 1;
      message.retained = false;

      this.client.send(message);
      console.log(`Response published to: ${message.destinationName}`);
    } catch (err) {
      console.error('Publish error:', err);
    }
  }

  /**
   * Control door lock
   */
  async unlockDoor() {
    try {
      console.log('Unlocking door...');
      this.doorLocked = false;
      
      // TODO: Add GPIO control for physical door lock
      // Example with RPi.GPIO:
      // GPIO.output(RELAY_PIN, GPIO.LOW);

      console.log('Door unlocked');
      return true;
    } catch (err) {
      console.error('Unlock error:', err);
      return false;
    }
  }

  /**
   * Lock door
   */
  async lockDoor() {
    try {
      console.log('Locking door...');
      this.doorLocked = true;

      // TODO: Add GPIO control for physical door lock
      // Example with RPi.GPIO:
      // GPIO.output(RELAY_PIN, GPIO.HIGH);

      console.log('Door locked');
      return true;
    } catch (err) {
      console.error('Lock error:', err);
      return false;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect() {
    if (this.client && this.isConnected) {
      this.client.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MQTT broker');
    }
  }

  /**
   * Get door status
   */
  getDoorStatus() {
    return {
      doorId: this.config.doorId,
      locked: this.doorLocked,
      connected: this.isConnected,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Example usage:
 * 
 * const controller = new MQTTDoorController();
 * 
 * (async () => {
 *   try {
 *     await controller.connect();
 *     console.log('Door controller started');
 *     
 *     // Keep process alive
 *     process.on('SIGINT', () => {
 *       controller.disconnect();
 *       process.exit(0);
 *     });
 *   } catch (err) {
 *     console.error('Failed to start controller:', err);
 *     process.exit(1);
 *   }
 * })();
 */

module.exports = MQTTDoorController;
