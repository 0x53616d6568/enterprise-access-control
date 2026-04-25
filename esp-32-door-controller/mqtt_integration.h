#ifndef MQTT_INTEGRATION_H
#define MQTT_INTEGRATION_H

/**
 * MQTT Integration for ESP-32 Door Controller
 * 
 * Optional MQTT support for:
 * 1. Receiving unlock commands from backend
 * 2. Publishing door state updates
 * 3. Publishing face recognition results
 * 
 * Requires: PubSubClient library
 * Install: Sketch → Include Library → Manage Libraries → Search "PubSubClient"
 */

// #include <PubSubClient.h>
// #include <WiFiClient.h>

// Configuration
#define MQTT_BROKER "mqtt-broker-aiven.aivencloud.com"
#define MQTT_PORT 1883
#define MQTT_USER "avnadmin"
#define MQTT_PASSWORD "your_mqtt_password"

// Topics
#define MQTT_TOPIC_UNLOCK_CMD "door/unlock"
#define MQTT_TOPIC_DOOR_STATE "door/state"
#define MQTT_TOPIC_FACE_RESULT "door/face_result"
#define MQTT_TOPIC_STATUS "door/status"

// MQTT client (uncomment if using MQTT)
// WiFiClient espClient;
// PubSubClient mqttClient(espClient);

/**
 * Initialize MQTT connection
 * Call this in setup() after WiFi is connected
 */
/*
void initializeMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);
  
  Serial.println("Attempting MQTT connection...");
  
  if (mqttClient.connect("ESP32_Door_Controller", MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("MQTT connected!");
    
    // Subscribe to unlock commands
    mqttClient.subscribe(MQTT_TOPIC_UNLOCK_CMD);
    
    // Publish initial status
    publishDoorState("LOCKED");
  } else {
    Serial.printf("MQTT connection failed, rc=%d\n", mqttClient.state());
  }
}

/**
 * Handle incoming MQTT messages
 */
void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  Serial.printf("MQTT Message [%s]: ", topic);
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
  
  // Parse unlock command
  if (strcmp(topic, MQTT_TOPIC_UNLOCK_CMD) == 0) {
    String message = String((char*)payload).substring(0, length);
    
    if (message == "unlock") {
      Serial.println("Unlock command received via MQTT");
      unlockDoor();
      publishDoorState("UNLOCKED");
    } else if (message == "lock") {
      Serial.println("Lock command received via MQTT");
      lockDoor();
      publishDoorState("LOCKED");
    }
  }
}

/**
 * Publish door state to MQTT
 */
void publishDoorState(const char* state) {
  if (mqttClient.connected()) {
    mqttClient.publish(MQTT_TOPIC_DOOR_STATE, state);
    Serial.printf("Published door state: %s\n", state);
  }
}

/**
 * Publish face recognition result
 */
void publishFaceResult(bool success, const char* userId, float confidence) {
  if (mqttClient.connected()) {
    // Create JSON payload
    char payload[256];
    snprintf(payload, sizeof(payload),
      "{\"success\":%s,\"user_id\":\"%s\",\"confidence\":%.2f}",
      success ? "true" : "false", userId, confidence);
    
    mqttClient.publish(MQTT_TOPIC_FACE_RESULT, payload);
    Serial.printf("Published face result: %s\n", payload);
  }
}

/**
 * Keep MQTT connection alive
 * Call this regularly in loop()
 */
void maintainMQTT() {
  if (!mqttClient.connected()) {
    // Attempt reconnection
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 5000) {  // Try every 5 seconds
      lastReconnect = millis();
      
      Serial.println("Attempting MQTT reconnection...");
      if (mqttClient.connect("ESP32_Door_Controller", MQTT_USER, MQTT_PASSWORD)) {
        Serial.println("MQTT reconnected");
        mqttClient.subscribe(MQTT_TOPIC_UNLOCK_CMD);
      }
    }
  } else {
    mqttClient.loop();
  }
}
*/

/**
 * Alternative: REST API Integration (simpler, no MQTT library needed)
 * 
 * Instead of MQTT, ESP-32 can periodically check backend for pending commands:
 */

#define BACKEND_API "https://enterprise-access-control-mqtt.onrender.com/api"

/**
 * Check backend for pending door commands (poll-based)
 * Call this periodically to check for unlocking requests
 */
/*
bool checkBackendForCommand(const char* deviceId) {
  HTTPClient http;
  String url = String(BACKEND_API) + "/door/commands?device_id=" + deviceId;
  
  if (!http.begin(url)) {
    return false;
  }
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse JSON: { "command": "unlock", "reason": "..." }
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload);
    
    const char* command = doc["command"];
    if (command != nullptr && strcmp(command, "unlock") == 0) {
      http.end();
      return true;  // Command to unlock
    }
  }
  
  http.end();
  return false;
}

/**
 * Report access attempt to backend for audit trail
 */
bool reportAccessAttempt(const char* deviceId, bool successful, 
                         const char* userId, float confidence) {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  String url = String(BACKEND_API) + "/door/log";
  
  if (!http.begin(client, url)) {
    return false;
  }
  
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["success"] = successful;
  doc["user_id"] = userId;
  doc["confidence"] = confidence;
  doc["timestamp"] = millis();  // Or use NTP for real timestamp
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.POST(jsonString);
  
  bool result = (httpCode == 200 || httpCode == 201);
  http.end();
  
  return result;
}
*/

#endif // MQTT_INTEGRATION_H

/**
 * INTEGRATION NOTES:
 * 
 * 1. To enable MQTT:
 *    - Install PubSubClient library
 *    - Uncomment all #include and functions above
 *    - Call initializeMQTT() in setup()
 *    - Call maintainMQTT() in loop()
 * 
 * 2. To enable REST API backend reporting:
 *    - Uncomment REST functions above
 *    - Call reportAccessAttempt() after face recognition
 *    - Optionally call checkBackendForCommand() in loop()
 * 
 * 3. MQTT Topics:
 *    - Incoming: door/unlock (message: "unlock" or "lock")
 *    - Outgoing: door/state (message: "LOCKED" or "UNLOCKED")
 *    - Outgoing: door/face_result (message: JSON with result)
 * 
 * 4. Backend API Endpoints (to create):
 *    - POST /api/door/log - Log access attempt
 *    - GET /api/door/commands?device_id=X - Check for pending commands
 */
