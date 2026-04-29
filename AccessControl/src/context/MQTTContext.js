import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';

const MQTTContext = createContext();

export const MQTTProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [doorStatus, setDoorStatus] = useState({});
  const [faceResults, setFaceResults] = useState({});
  const [lastMessage, setLastMessage] = useState(null);

  const MQTT_BROKER = 'wss://bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud:8884/mqtt';
  const MQTT_USERNAME = 'Sameh';
  const MQTT_PASSWORD = 'Samehsameh1020';

  // Initialize MQTT connection
  useEffect(() => {
    const initMqtt = () => {
      try {
        const mqttClient = mqtt.connect(MQTT_BROKER, {
          username: MQTT_USERNAME,
          password: MQTT_PASSWORD,
          clientId: `react-native-${Date.now()}`,
          clean: true,
          reconnectPeriod: 5000,
          rejectUnauthorized: false
        });

        mqttClient.on('connect', () => {
          console.log('✅ [MQTT] Connected to HiveMQ');
          setConnected(true);
          
          // Subscribe to all door topics
          mqttClient.subscribe('doors/+/status', (err) => {
            if (!err) console.log('📡 [MQTT] Subscribed to doors/+/status');
          });
          
          mqttClient.subscribe('doors/+/events', (err) => {
            if (!err) console.log('📡 [MQTT] Subscribed to doors/+/events');
          });
        });

        mqttClient.on('message', (topic, message) => {
          const payload = message.toString();
          console.log(`[MQTT] Message [${topic}]: ${payload}`);
          setLastMessage({ topic, payload, timestamp: new Date() });

          // Parse door status messages
          if (topic.includes('/status')) {
            const doorIdMatch = topic.match(/doors\/(\d+)\/status/);
            if (doorIdMatch) {
              const doorId = doorIdMatch[1];
              setDoorStatus(prev => ({ ...prev, [doorId]: payload }));
            }
          }

          // Parse event messages (face results, etc)
          if (topic.includes('/events')) {
            const doorIdMatch = topic.match(/doors\/(\d+)\/events/);
            if (doorIdMatch) {
              const doorId = doorIdMatch[1];
              try {
                const result = JSON.parse(payload);
                setFaceResults(prev => ({ ...prev, [doorId]: result }));
              } catch (e) {
                console.error('Failed to parse event:', e);
              }
            }
          }
        });

        mqttClient.on('error', (err) => {
          console.error('❌ [MQTT] Error:', err.message);
          setConnected(false);
        });

        mqttClient.on('disconnect', () => {
          console.log('🔌 [MQTT] Disconnected');
          setConnected(false);
        });

        setClient(mqttClient);
      } catch (err) {
        console.error('❌ Failed to initialize MQTT:', err);
      }
    };

    initMqtt();

    return () => {
      if (client) {
        client.end();
      }
    };
  }, []);

  // Publish unlock command
  const publishUnlock = useCallback((doorId, duration = 5000) => {
    if (!client || !connected) {
      console.error('❌ MQTT not connected');
      return false;
    }

    const topic = `doors/${doorId}/control`;
    const payload = JSON.stringify({
      action: 'UNLOCK',
      doorId,
      duration,
      timestamp: new Date().toISOString()
    });

    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to publish to ${topic}:`, err);
      } else {
        console.log(`✅ Published unlock to ${topic}`);
      }
    });

    return true;
  }, [client, connected]);

  // Publish lock command
  const publishLock = useCallback((doorId) => {
    if (!client || !connected) {
      console.error('❌ MQTT not connected');
      return false;
    }

    const topic = `doors/${doorId}/control`;
    const payload = JSON.stringify({
      action: 'LOCK',
      doorId,
      timestamp: new Date().toISOString()
    });

    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to publish to ${topic}:`, err);
      } else {
        console.log(`✅ Published lock to ${topic}`);
      }
    });

    return true;
  }, [client, connected]);

  // Publish status request
  const publishStatus = useCallback((doorId) => {
    if (!client || !connected) {
      console.error('❌ MQTT not connected');
      return false;
    }

    const topic = `doors/${doorId}/status`;
    const payload = JSON.stringify({
      action: 'STATUS',
      doorId,
      timestamp: new Date().toISOString()
    });

    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to publish to ${topic}:`, err);
      } else {
        console.log(`✅ Published status to ${topic}`);
      }
    });

    return true;
  }, [client, connected]);

  const value = {
    connected,
    doorStatus,
    faceResults,
    lastMessage,
    publishUnlock,
    publishLock,
    publishStatus
  };

  return (
    <MQTTContext.Provider value={value}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTT = () => {
  const context = useContext(MQTTContext);
  if (!context) {
    throw new Error('useMQTT must be used within MQTTProvider');
  }
  return context;
};
