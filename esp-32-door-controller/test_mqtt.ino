/**
 * ESP-32 MQTT Test Sketch
 * Tests MQTT connectivity to HiveMQ MQTT broker
 * 
 * Before uploading:
 * 1. Install PubSubClient library: Sketch → Include Library → Manage Libraries → "PubSubClient"
 * 2. Update SSID and WIFI_PASSWORD below
 * 3. Update MQTT credentials if needed
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// WiFi Configuration
#define SSID "sameh"
#define WIFI_PASSWORD "122334455667788990"

// MQTT Configuration - HiveMQ Cloud (with SSL/TLS on port 8883)
#define MQTT_BROKER "bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "sameh"
#define MQTT_PASSWORD "Samehsameh1020"

// MQTT Topics
#define MQTT_TOPIC_UNLOCK_CMD "door/unlock"
#define MQTT_TOPIC_DOOR_STATE "door/state"
#define MQTT_TOPIC_FACE_RESULT "door/face_result"
#define MQTT_TOPIC_STATUS "door/status"

// GPIO Pins
#define LED_PIN 4  // Status LED (optional)
#define RELAY_PIN 12  // Door lock control (optional)

// Global objects - Use WiFiClientSecure for port 8883 (SSL/TLS)
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// State variables
unsigned long lastReconnectAttempt = 0;
int reconnectInterval = 5000;  // 5 seconds
int messageCounter = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);  // Wait for Serial to stabilize
  
  Serial.println("\n\n=== ESP-32 MQTT Test ===");
  Serial.println("Initializing...\n");
  
  // Setup pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Configure SSL/TLS for HiveMQ Cloud (port 8883)
  // For testing/development only - use setInsecure()
  // For production, implement proper certificate validation
  espClient.setInsecure();
  
  // Setup MQTT client
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);
  mqttClient.setBufferSize(512);
  
  Serial.println("Setup complete. Attempting MQTT connection...\n");
}

void loop() {
  // Reconnect to WiFi if needed
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    if (millis() - lastReconnectAttempt > 10000) {
      Serial.println("WiFi disconnected, reconnecting...");
      connectToWiFi();
      lastReconnectAttempt = millis();
    }
  } else {
    // Reconnect to MQTT if needed
    if (!mqttClient.connected()) {
      if (millis() - lastReconnectAttempt > reconnectInterval) {
        reconnectMQTT();
        lastReconnectAttempt = millis();
      }
    } else {
      digitalWrite(LED_PIN, HIGH);
      mqttClient.loop();  // Handle incoming messages
      
      // Periodically publish test messages
      static unsigned long lastPublish = 0;
      if (millis() - lastPublish > 10000) {  // Every 10 seconds
        publishTestMessages();
        lastPublish = millis();
      }
    }
  }
  
  // Check for Serial commands
  if (Serial.available()) {
    handleSerialCommand();
  }
  
  delay(10);
}

/**
 * Connect to WiFi network
 */
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm\n");
  } else {
    Serial.println("Failed to connect to WiFi\n");
  }
}

/**
 * Reconnect to MQTT broker
 */
void reconnectMQTT() {
  Serial.print("Attempting MQTT connection to ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  
  // Create client ID
  String clientId = "ESP32_Door_Test_";
  clientId += String(random(0xffff), HEX);
  
  Serial.print("Client ID: ");
  Serial.println(clientId);
  Serial.print("Username: ");
  Serial.println(MQTT_USER);
  Serial.print("Password: ");
  Serial.println(MQTT_PASSWORD);
  
  // Attempt connection with authentication
  // For HiveMQ Cloud, authentication is required on port 8883
  Serial.println("Sending MQTT CONNECT packet...");
  
  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("✓ MQTT connected successfully!");
    Serial.print("Connected Client ID: ");
    Serial.println(clientId);
    
    // Subscribe to topics
    Serial.println("\nSubscribing to topics:");
    subscribeToTopics();
    
    // Publish startup message
    publishStatus("ONLINE");
    
  } else {
    int errorCode = mqttClient.state();
    Serial.print("✗ MQTT connection failed with error code: ");
    Serial.println(errorCode);
    
    // Detailed error explanation
    Serial.println("\nError Code Reference:");
    printMQTTErrorCode(errorCode);
    
    Serial.println("\nTroubleshooting:");
    Serial.println("1. Check WiFi is connected: type 'status'");
    Serial.println("2. Verify HiveMQ credentials in code");
    Serial.println("3. Ensure HiveMQ cluster is running");
    Serial.println("4. Check firewall allows port 8883");
    Serial.println();
  }
}

/**
 * Print detailed MQTT error code explanation
 */
void printMQTTErrorCode(int code) {
  switch(code) {
    case -4:
      Serial.println("  -4: MQTT_CONNECTION_TIMEOUT");
      Serial.println("      → Broker did not respond. Check broker URL and port.");
      break;
    case -3:
      Serial.println("  -3: MQTT_CONNECTION_LOST");
      Serial.println("      → Connection was lost. WiFi or network issue.");
      break;
    case -2:
      Serial.println("  -2: MQTT_CONNECT_FAILED");
      Serial.println("      → Failed to connect to broker. Network unreachable.");
      break;
    case -1:
      Serial.println("  -1: MQTT_DISCONNECTED");
      Serial.println("      → Client is disconnected. Call connect().");
      break;
    case 0:
      Serial.println("   0: MQTT_CONNECTED");
      Serial.println("      → Successfully connected!");
      break;
    case 1:
      Serial.println("   1: MQTT_CONNECT_BAD_PROTOCOL");
      Serial.println("      → Broker rejected protocol. Check MQTT version.");
      break;
    case 2:
      Serial.println("   2: MQTT_CONNECT_BAD_CLIENT_ID");
      Serial.println("      → Client ID rejected. Try different client ID.");
      break;
    case 3:
      Serial.println("   3: MQTT_CONNECT_UNAVAILABLE");
      Serial.println("      → Broker unavailable. Try again later.");
      break;
    case 4:
      Serial.println("   4: MQTT_CONNECT_BAD_CREDENTIALS");
      Serial.println("      → Authentication failed!");
      Serial.println("      → Check username and password.");
      Serial.println("      → Verify HiveMQ cluster auth is enabled.");
      break;
    case 5:
      Serial.println("   5: MQTT_CONNECT_UNAUTHORIZED");
      Serial.println("      → Connection not authorized.");
      Serial.println("      → Check ACL permissions on HiveMQ.");
      break;
    default:
      Serial.print("      → Unknown error code: ");
      Serial.println(code);
  }
}

/**
 * Subscribe to all monitored topics
 */
void subscribeToTopics() {
  mqttClient.subscribe(MQTT_TOPIC_UNLOCK_CMD);
  Serial.print("  → ");
  Serial.println(MQTT_TOPIC_UNLOCK_CMD);
  
  mqttClient.subscribe(MQTT_TOPIC_DOOR_STATE);
  Serial.print("  → ");
  Serial.println(MQTT_TOPIC_DOOR_STATE);
  
  mqttClient.subscribe(MQTT_TOPIC_FACE_RESULT);
  Serial.print("  → ");
  Serial.println(MQTT_TOPIC_FACE_RESULT);
  
  Serial.println();
}

/**
 * Callback for incoming MQTT messages
 */
void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  Serial.print("📨 Received message on topic: ");
  Serial.println(topic);
  Serial.print("   Payload: ");
  
  // Print payload
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle unlock command
  if (strcmp(topic, MQTT_TOPIC_UNLOCK_CMD) == 0) {
    if (message == "true" || message == "1" || message == "UNLOCK") {
      Serial.println("   → UNLOCKING DOOR!");
      digitalWrite(RELAY_PIN, HIGH);
      delay(3000);  // Keep unlocked for 3 seconds
      digitalWrite(RELAY_PIN, LOW);
      publishStatus("DOOR_UNLOCKED");
    }
  }
}

/**
 * Publish test messages to all topics
 */
void publishTestMessages() {
  messageCounter++;
  
  Serial.println("📤 Publishing test messages...");
  
  // Publish door state
  String doorState = "{\"locked\":true,\"timestamp\":" + String(millis()) + "}";
  publishMessage(MQTT_TOPIC_DOOR_STATE, doorState);
  
  // Publish face result
  String faceResult = "{\"match\":true,\"confidence\":0.95,\"user_id\":\"test_user\",\"timestamp\":" + String(millis()) + "}";
  publishMessage(MQTT_TOPIC_FACE_RESULT, faceResult);
  
  // Publish status
  String status = "{\"status\":\"ONLINE\",\"messages_sent\":" + String(messageCounter) + ",\"uptime\":" + String(millis() / 1000) + "}";
  publishMessage(MQTT_TOPIC_STATUS, status);
  
  Serial.println();
}

/**
 * Publish a single message
 */
void publishMessage(const char* topic, String message) {
  if (mqttClient.publish(topic, message.c_str())) {
    Serial.print("  ✓ Published to ");
    Serial.print(topic);
    Serial.print(": ");
    Serial.println(message);
  } else {
    Serial.print("  ✗ Failed to publish to ");
    Serial.println(topic);
  }
}

/**
 * Publish status message
 */
void publishStatus(const char* status) {
  String message = "{\"status\":\"" + String(status) + "\",\"timestamp\":" + String(millis()) + "}";
  publishMessage(MQTT_TOPIC_STATUS, message);
}

/**
 * Handle commands from Serial Monitor
 */
void handleSerialCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  
  Serial.println();
  
  if (command == "help") {
    printHelp();
  }
  else if (command == "status") {
    printStatus();
  }
  else if (command == "unlock") {
    Serial.println("Publishing UNLOCK command...");
    mqttClient.publish(MQTT_TOPIC_UNLOCK_CMD, "UNLOCK");
  }
  else if (command == "test") {
    Serial.println("Publishing test messages...");
    publishTestMessages();
  }
  else if (command == "info") {
    printDetailedInfo();
  }
  else {
    Serial.println("Unknown command. Type 'help' for options.");
  }
  
  Serial.println();
}

/**
 * Print help menu
 */
void printHelp() {
  Serial.println("=== MQTT Test Commands ===");
  Serial.println("status  - Show connection status");
  Serial.println("unlock  - Send UNLOCK command");
  Serial.println("test    - Publish test messages");
  Serial.println("info    - Show detailed information");
  Serial.println("help    - Show this help menu");
}

/**
 * Print current status
 */
void printStatus() {
  Serial.println("=== Connection Status ===");
  Serial.print("WiFi: ");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✓ Connected (");
    Serial.print(WiFi.localIP());
    Serial.print(", ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm)");
  } else {
    Serial.println("✗ Disconnected");
  }
  
  Serial.print("MQTT: ");
  if (mqttClient.connected()) {
    Serial.println("✓ Connected");
  } else {
    Serial.println("✗ Disconnected");
  }
  
  Serial.print("Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
}

/**
 * Print detailed information
 */
void printDetailedInfo() {
  Serial.println("=== Detailed Information ===");
  Serial.print("Broker: ");
  Serial.println(MQTT_BROKER);
  Serial.print("Port: ");
  Serial.println(MQTT_PORT);
  Serial.print("User: ");
  Serial.println(MQTT_USER);
  Serial.println("\nTopics:");
  Serial.print("  Unlock: ");
  Serial.println(MQTT_TOPIC_UNLOCK_CMD);
  Serial.print("  State: ");
  Serial.println(MQTT_TOPIC_DOOR_STATE);
  Serial.print("  Face Result: ");
  Serial.println(MQTT_TOPIC_FACE_RESULT);
  Serial.print("  Status: ");
  Serial.println(MQTT_TOPIC_STATUS);
}
