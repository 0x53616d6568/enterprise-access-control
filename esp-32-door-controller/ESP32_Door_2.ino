/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║     ESP-32 Door Access Controller - DOOR 2                   ║
 * ║     MQTT-based IoT Door Lock with Face Recognition            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * Door: Engineering Floor (Floor 2 · East Wing)
 * Topic: doors/2/unlock
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

// ============================================
// ⚙️  CONFIGURATION - DOOR 2
// ============================================

#define WIFI_SSID "MAXBOX5G_AFE0"
#define WIFI_PASSWORD "t3wkuygg7xxh"

#define MQTT_BROKER "bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "Sameh"
#define MQTT_PASSWORD "Samehsameh1020"

#define DOOR_ID 2                    // ← DOOR 2
#define UNLOCK_DURATION 3000
#define CONFIDENCE_THRESHOLD 0.6

#define FACE_SERVICE_URL "https://Soapppp11-enterprise-access-control-face.hf.space"
#define FACE_SERVICE_API_KEY ""
#define BACKEND_API "https://enterprise-access-control.onrender.com/api"

// Pin Definitions
#define RELAY_PIN 12
#define BUTTON_PIN 13
#define LED_PIN 4

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
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("╔═══════════════════════════════════════╗");
  Serial.println("║  ESP-32 Door 2 Controller Booting...  ║");
  Serial.println("╚═══════════════════════════════════════╝");
  Serial.println();
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
  
  Serial.println("[INIT] Pins initialized");
  Serial.println("[INIT] Door locked");
  
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonISR, FALLING);
  Serial.println("[INIT] Button interrupt attached");
  
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
  Serial.println("Available commands: TRIGGER, UNLOCK, LOCK, STATUS, HELP\n");
  
  initializeMQTT();
  blinkLED(3, 200);
}

void loop() {
  if (Serial.available()) {
    handleSerialCommand();
  }
  
  if (triggerAccess) {
    triggerAccess = false;
    handleAccessRequest();
  }
  
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
  else if (command == "UNLOCK") {
    Serial.println("  → Unlocking door");
    unlockDoor(UNLOCK_DURATION);
  }
  else if (command == "LOCK") {
    Serial.println("  → Locking door");
    lockDoor();
  }
  else if (command == "STATUS") {
    Serial.printf("Door State: %s, WiFi: %s\n", getDoorStateString().c_str(),
      (WiFi.status() == WL_CONNECTED) ? "Connected" : "Disconnected");
  }
  else if (command == "HELP") {
    Serial.println("Commands: TRIGGER, UNLOCK, LOCK, STATUS, HELP");
  }
}

// ============================================
// 🔓 DOOR CONTROL
// ============================================

void unlockDoor(int duration = UNLOCK_DURATION) {
  Serial.println("🔓 UNLOCKING DOOR...");
  currentDoorState = UNLOCKING;
  
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.printf("   Duration: %d ms\n", duration);
  unsigned long unlockStart = millis();
  
  while (millis() - unlockStart < duration) {
    delay(50);
  }
  
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
  
  Serial.println("🔒 Door re-locked");
}

void lockDoor() {
  Serial.println("🔒 LOCKING DOOR");
  digitalWrite(RELAY_PIN, HIGH);
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
  
  return true;
}

// ============================================
// 🎯 ACCESS REQUEST HANDLING
// ============================================

void handleAccessRequest() {
  Serial.println("\n[ACCESS] Granting access...");
  unlockDoor(UNLOCK_DURATION);
  Serial.println("[ACCESS] ✅ Request complete\n");
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
// 📡 MQTT INTEGRATION
// ============================================

void initializeMQTT() {
  espClient.setInsecure();
  
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);
  
  Serial.println("[MQTT] Attempting connection...");
  
  if (mqttClient.connect("ESP32_Door_2", MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("[MQTT] ✅ Connected!");
    
    char topic[64];
    snprintf(topic, sizeof(topic), "doors/%d/unlock", DOOR_ID);
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
  
  char expectedTopic[64];
  snprintf(expectedTopic, sizeof(expectedTopic), "doors/%d/unlock", DOOR_ID);
  
  if (strcmp(topic, expectedTopic) == 0) {
    String jsonStr = String((char*)payload).substring(0, length);
    
    Serial.println("[MQTT] 🔓 Parsing unlock command...");
    
    if (jsonStr.indexOf("\"action\":\"UNLOCK\"") >= 0 || jsonStr.indexOf("\"action\": \"UNLOCK\"") >= 0) {
      Serial.println("[MQTT] ✅ Unlock command recognized!");
      
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
    snprintf(topic, sizeof(topic), "doors/%d/state", DOOR_ID);
    mqttClient.publish(topic, state);
    Serial.printf("[MQTT] Published door state: %s\n", state);
  }
}

void maintainMQTT() {
  if (!mqttClient.connected()) {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 5000) {
      lastReconnect = millis();
      
      Serial.println("[MQTT] Attempting reconnection...");
      if (mqttClient.connect("ESP32_Door_2", MQTT_USER, MQTT_PASSWORD)) {
        Serial.println("[MQTT] ✅ Reconnected");
        
        char topic[64];
        snprintf(topic, sizeof(topic), "doors/%d/unlock", DOOR_ID);
        mqttClient.subscribe(topic);
      } else {
        Serial.printf("[MQTT] ❌ Reconnect failed, rc=%d\n", mqttClient.state());
      }
    }
  } else {
    mqttClient.loop();
  }
}
