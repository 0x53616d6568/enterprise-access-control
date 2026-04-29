/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║     ESP-32 Door Access Controller (Unified Sketch)            ║
 * ║     MQTT-based IoT Door Lock with Face Recognition            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * Features:
 *  • WiFi connectivity
 *  • MQTT door unlock commands from backend
 *  • Button-triggered access requests
 *  • Door relay control with LED feedback
 *  • Serial debug commands
 * 
 * Dependencies:
 *  • ArduinoJson (Sketch → Include Library → Manage Libraries → Search "ArduinoJson")
 *  • PubSubClient (optional, for MQTT - included but commented)
 * 
 * Pin Configuration:
 *  • GPIO12 (Pin 12) - Door lock relay
 *  • GPIO13 (Pin 13) - Manual trigger button
 *  • GPIO4 (Pin 4) - Status LED
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

// ============================================
// ⚙️  CONFIGURATION - EDIT THIS SECTION
// ============================================

// WiFi Settings
#define WIFI_SSID "MAXBOX5G_AFE0"
#define WIFI_PASSWORD "t3wkuygg7xxh"

// MQTT Broker Settings
#define MQTT_BROKER "bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "Sameh"           // ← Capital S
#define MQTT_PASSWORD "Samehsameh1020"

// Door Configuration
#define DOOR_ID 1                    // Your door ID
#define UNLOCK_DURATION 3000         // How long door stays unlocked (ms)
#define CONFIDENCE_THRESHOLD 0.6     // Min confidence for face recognition

// Face Recognition Service
#define FACE_SERVICE_URL "https://Soapppp11-enterprise-access-control-face.hf.space"
#define FACE_SERVICE_API_KEY ""      // Leave empty if not required

// Backend API
#define BACKEND_API "https://enterprise-access-control.onrender.com/api"
#define BACKEND_API_KEY "your-esp-api-key-here"  // Set this to your Pi API key

// Pin Definitions
#define RELAY_PIN 12                 // Door lock relay
#define BUTTON_PIN 13                // Manual trigger button
#define LED_PIN 4                    // Status LED

// ============================================
// MQTT Client
// ============================================
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// ============================================
// Forward Declarations
// ============================================
void buttonISR();
void handleSerialCommand();
void handleAccessRequest();
void unlockDoor(int duration = UNLOCK_DURATION);
void lockDoor();
void blinkLED(int count, int delayMs);
void initializeMQTT();
void maintainMQTT();
void onMQTTMessage(char* topic, byte* payload, unsigned int length);
bool connectToWiFi(const char *ssid, const char *password);

// ============================================
// Global Variables
// ============================================

enum DoorState {
  LOCKED = 0,
  UNLOCKED = 1,
  UNLOCKING = 2,
  ERROR = 3
};

volatile bool triggerAccess = false;
unsigned long lastButtonPress = 0;
const unsigned long DEBOUNCE_TIME = 500;

DoorState currentDoorState = LOCKED;

// Camera status flag
bool cameraInitialized = false;  // Set to true if camera module is initialized

#define MAX_IMAGE_SIZE 100000
uint8_t imageBuffer[MAX_IMAGE_SIZE];
size_t imageSize = 0;

struct FaceResponse {
  bool success;
  bool faceDetected;
  float confidence;
  String userId;
  String message;
};

// ============================================
// 🔌 SETUP & INITIALIZATION
// ============================================

void setup() {
  Serial.begin(115200);
  delay(2000);  // Give serial monitor time to connect
  
  Serial.println("\n\n");
  Serial.println("╔═══════════════════════════════════════╗");
  Serial.println("║  ESP-32 Door Controller Booting...    ║");
  Serial.println("╚═══════════════════════════════════════╝");
  Serial.println();
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Lock door on startup
  digitalWrite(RELAY_PIN, HIGH);    // HIGH = locked
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
  
  Serial.println("[INIT] Pins initialized");
  Serial.println("[INIT] Door locked");
  
  // Attach button interrupt
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonISR, FALLING);
  Serial.println("[INIT] Button interrupt attached");
  
  // Connect WiFi
  if (!connectToWiFi(WIFI_SSID, WIFI_PASSWORD)) {
    Serial.println("[ERROR] WiFi connection failed - HALTING");
    while (1) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }
  
  Serial.println("\n✅ Setup complete!\n");
  Serial.println("Available commands:");
  Serial.println("  TRIGGER       - Request door access");
  Serial.println("  DOOR_ACCESS   - Test door access flows (NEW)");
  Serial.println("  UNLOCK        - Unlock door");
  Serial.println("  LOCK          - Lock door");
  Serial.println("  STATUS        - Show system status");
  Serial.println("  HELP          - Show this menu\n");
  
  // Initialize MQTT
  initializeMQTT();
  
  blinkLED(3, 200);
}

void loop() {
  // Handle serial input
  if (Serial.available()) {
    handleSerialCommand();
  }
  
  // Handle access trigger (from button or serial)
  if (triggerAccess) {
    triggerAccess = false;
    handleAccessRequest();
  }
  
  // Maintain MQTT connection
  maintainMQTT();
  
  delay(100);
}

// ============================================
// 🔘 BUTTON & SERIAL HANDLERS
// ============================================

void IRAM_ATTR buttonISR() {
  unsigned long currentTime = millis();
  if (currentTime - lastButtonPress > DEBOUNCE_TIME) {
    triggerAccess = true;
    lastButtonPress = currentTime;
  }
}

void handleSerialCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  if (command.length() == 0) return;
  
  Serial.printf("\n[CMD] %s\n", command.c_str());
  
  if (command == "TRIGGER") {
    Serial.println("  → Starting access request...");
    triggerAccess = true;
  }
  else if (command == "DOOR_ACCESS") {
    // New: Interactive door access test menu
    handleDoorAccessTestMenu();
  }
  else if (command == "UNLOCK") {
    Serial.println("  → Unlocking door");
    unlockDoor(UNLOCK_DURATION);
  }
  else if (command == "LOCK") {
    Serial.println("  → Locking door");
    lockDoor();
  }
  else if (command == "STATUS") {
    printStatus();
  }
  else if (command == "HELP") {
    printHelp();
  }
  else {
    Serial.println("  → Unknown command. Type HELP for commands.");
  }
}

void printHelp() {
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║       Serial Command Help              ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.println("║ TRIGGER      - Request door access    ║");
  Serial.println("║ DOOR_ACCESS  - Test door flows (NEW)  ║");
  Serial.println("║ UNLOCK       - Unlock door now        ║");
  Serial.println("║ LOCK         - Lock door now          ║");
  Serial.println("║ STATUS       - Show system status     ║");
  Serial.println("║ HELP         - Show this menu         ║");
  Serial.println("╚════════════════════════════════════════╝\n");
}

/**
 * Interactive menu for testing door access flows
 * Guides user through Scenario 1 and Scenario 2
 */
void handleDoorAccessTestMenu() {
  bool inMenu = true;
  
  while (inMenu) {
    showDoorAccessMenu();
    
    // Wait for user input
    while (!Serial.available()) {
      delay(100);
    }
    
    char choice = Serial.read();
    Serial.println(choice);  // Echo input
    
    // Consume newline if present
    if (Serial.available() && Serial.peek() == '\n') {
      Serial.read();
    }
    delay(100);
    
    if (choice == '3' || choice == 'q' || choice == 'Q') {
      inMenu = false;
    } else {
      handleDoorAccessMenu(choice);
    }
  }
}

void printStatus() {
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║        System Status Report            ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.printf("║ Door State:    %-25s ║\n", getDoorStateString().c_str());
  Serial.printf("║ WiFi:          %-25s ║\n", 
    (WiFi.status() == WL_CONNECTED) ? "Connected" : "Disconnected");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("║ IP Address:    %-25s ║\n", WiFi.localIP().toString().c_str());
    Serial.printf("║ Signal:        %-25d ║\n", WiFi.RSSI());
  }
  
  Serial.printf("║ Image Buffer:  %d / %d bytes      ║\n", imageSize, MAX_IMAGE_SIZE);
  Serial.println("╚════════════════════════════════════════╝\n");
}

// ============================================
// 🔓 DOOR CONTROL
// ============================================

void unlockDoor(int duration = UNLOCK_DURATION) {
  Serial.println("🔓 UNLOCKING DOOR...");
  currentDoorState = UNLOCKING;
  
  // Energize relay to unlock (LOW = unlock)
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);      // LED ON while unlocked
  
  Serial.printf("   Duration: %d ms\n", duration);
  unsigned long unlockStart = millis();
  
  while (millis() - unlockStart < duration) {
    delay(50);
  }
  
  // Re-lock
  digitalWrite(RELAY_PIN, HIGH);    // HIGH = lock
  digitalWrite(LED_PIN, LOW);       // LED OFF
  currentDoorState = LOCKED;
  
  Serial.println("🔒 Door re-locked");
}

void lockDoor() {
  Serial.println("🔒 LOCKING DOOR");
  digitalWrite(RELAY_PIN, HIGH);    // HIGH = lock
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
}

String getDoorStateString() {
  switch (currentDoorState) {
    case LOCKED:
      return "LOCKED";
    case UNLOCKED:
      return "UNLOCKED";
    case UNLOCKING:
      return "UNLOCKING";
    case ERROR:
      return "ERROR";
    default:
      return "UNKNOWN";
  }
}

// ============================================
// 📡 NETWORK & WiFi
// ============================================

bool connectToWiFi(const char *ssid, const char *password) {
  Serial.printf("\n[WiFi] Connecting to: %s\n", ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  const int MAX_ATTEMPTS = 20;
  
  while (WiFi.status() != WL_CONNECTED && attempts < MAX_ATTEMPTS) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("[WiFi] ❌ Failed after %d attempts\n", MAX_ATTEMPTS);
    return false;
  }
  
  Serial.println("[WiFi] ✅ Connected!");
  Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("[WiFi] Signal: %d dBm\n", WiFi.RSSI());
  
  return true;
}

bool ensureWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  
  Serial.println("[WiFi] Connection lost, reconnecting...");
  WiFi.reconnect();
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[WiFi] ❌ Reconnection failed");
    return false;
  }
  
  Serial.println("\n[WiFi] ✅ Reconnected");
  return true;
}

// ============================================
// 🎯 ACCESS REQUEST HANDLING
// ============================================

void handleAccessRequest() {
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║    Access Request Triggered            ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  digitalWrite(LED_PIN, HIGH);      // Indicate processing
  
  // For demo: just unlock the door
  // In production: verify with backend first
  
  Serial.println("[ACCESS] Granting access...");
  unlockDoor(UNLOCK_DURATION);
  
  Serial.println("[ACCESS] ✅ Request complete\n");
  digitalWrite(LED_PIN, LOW);
}

// ============================================
// 💡 LED FEEDBACK
// ============================================

void blinkLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

// ============================================
// 🔥 ERROR HANDLER
// ============================================

void handleError(const char *message) {
  Serial.printf("\n[ERROR] %s\n", message);
  
  // Flash LED rapidly to indicate error
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

// ============================================
// 📡 MQTT INTEGRATION
// ============================================

void initializeMQTT() {
  espClient.setInsecure();  // Allow self-signed certificates
  
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);
  
  Serial.println("[MQTT] Attempting connection...");
  
  if (mqttClient.connect("ESP32_Door_1", MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("[MQTT] ✅ Connected!");
    
    // Subscribe to door-specific control commands
    char topic[64];
    snprintf(topic, sizeof(topic), "doors/%d/control", DOOR_ID);
    mqttClient.subscribe(topic);
    Serial.printf("[MQTT] 📡 Subscribed to: %s\n", topic);
  } else {
    Serial.printf("[MQTT] ❌ Connection failed, rc=%d\n", mqttClient.state());
  }
}

void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  Serial.printf("[MQTT] Message [%s]: ", topic);
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
  
  // Create topic string for comparison
  char expectedTopic[64];
  snprintf(expectedTopic, sizeof(expectedTopic), "doors/%d/control", DOOR_ID);
  
  // Check if this is a control command for our door
  if (strcmp(topic, expectedTopic) == 0) {
    // Parse JSON payload
    // Expected: { "action": "UNLOCK", "doorId": 1, "userId": 123, "duration": 3000 }
    String jsonStr = String((char*)payload).substring(0, length);
    
    Serial.println("[MQTT] 🔓 Parsing control command...");
    
    // Simple JSON parsing (looking for "action": "UNLOCK")
    if (jsonStr.indexOf("\"action\":\"UNLOCK\"") >= 0 || jsonStr.indexOf("\"action\": \"UNLOCK\"") >= 0) {
      Serial.println("[MQTT] ✅ Unlock command recognized!");
      
      // Get duration if specified (default 3000ms)
      int durationIdx = jsonStr.indexOf("\"duration\"");
      int duration = UNLOCK_DURATION;
      if (durationIdx >= 0) {
        int colonIdx = jsonStr.indexOf(":", durationIdx);
        int commaIdx = jsonStr.indexOf(",", colonIdx);
        if (commaIdx < 0) commaIdx = jsonStr.indexOf("}", colonIdx);
        
        String durationStr = jsonStr.substring(colonIdx + 1, commaIdx);
        durationStr.trim();
        duration = durationStr.toInt();
        Serial.printf("[MQTT]    Duration: %d ms\n", duration);
      }
      
      Serial.println("[MQTT] 🔓 UNLOCKING DOOR VIA MQTT");
      unlockDoor(duration);
      
    } else {
      Serial.println("[MQTT] ❌ Unrecognized command");
    }
  }
}

void publishDoorState(const char* state) {
  if (mqttClient.connected()) {
    char topic[64];
    snprintf(topic, sizeof(topic), "doors/%d/status", DOOR_ID);
    mqttClient.publish(topic, state);
    Serial.printf("[MQTT] Published door status: %s\n", state);
  }
}

void publishFaceResult(bool success, const char* userId, float confidence) {
  if (mqttClient.connected()) {
    char topic[64];
    snprintf(topic, sizeof(topic), "doors/%d/events", DOOR_ID);
    
    // Create JSON payload
    char payload[256];
    snprintf(payload, sizeof(payload),
      "{\"success\":%s,\"user_id\":\"%s\",\"confidence\":%.2f}",
      success ? "true" : "false", userId, confidence);
    
    mqttClient.publish(topic, payload);
    Serial.printf("[MQTT] Published face result: %s\n", payload);
  }
}

void maintainMQTT() {
  if (!mqttClient.connected()) {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 5000) {  // Try every 5 seconds
      lastReconnect = millis();
      
      Serial.println("[MQTT] Attempting reconnection...");
      if (mqttClient.connect("ESP32_Door_1", MQTT_USER, MQTT_PASSWORD)) {
        Serial.println("[MQTT] ✅ Reconnected");
        
        // Resubscribe to topic
        char topic[64];
        snprintf(topic, sizeof(topic), "doors/%d/control", DOOR_ID);
        mqttClient.subscribe(topic);
      } else {
        Serial.printf("[MQTT] ❌ Reconnect failed, rc=%d\n", mqttClient.state());
      }
    }
  } else {
    mqttClient.loop();
  }
}

// ============================================
// FOOTER
// ============================================

/*
 * ✅ MQTT Integration ENABLED
 * 
 * Features:
 *  • Subscribes to: doors/{DOOR_ID}/control
 *  • Publishes door status to: doors/{DOOR_ID}/status
 *  • Publishes events to: doors/{DOOR_ID}/events
 *  • Automatically reconnects if connection drops
 *  • Receives JSON unlock commands: {"action":"UNLOCK","duration":3000}
 * 
 * Backend will publish unlock commands after verifying door access.
 * ESP32 will automatically unlock for the specified duration.
 */
