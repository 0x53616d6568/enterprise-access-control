/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║     ESP-32 Door Access Controller - DOOR 3                   ║
 * ║     MQTT-based IoT Door Lock with Face Recognition            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * Door: Server Room (Floor 3 · North)
 * Topic: doors/3/unlock
 * 
 * Configuration: Just upload and go! Everything is pre-configured for Door 3.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

#define WIFI_SSID "MAXBOX5G_AFE0"
#define WIFI_PASSWORD "t3wkuygg7xxh"
#define MQTT_BROKER "bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "Sameh"
#define MQTT_PASSWORD "Samehsameh1020"
#define DOOR_ID 3
#define UNLOCK_DURATION 3000

#define RELAY_PIN 12
#define BUTTON_PIN 13
#define LED_PIN 4

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

enum DoorState { LOCKED = 0, UNLOCKED = 1, UNLOCKING = 2, ERROR = 3 };
volatile bool triggerAccess = false;
unsigned long lastButtonPress = 0;
const unsigned long DEBOUNCE_TIME = 500;
DoorState currentDoorState = LOCKED;

void buttonISR();
void unlockDoor(int duration = UNLOCK_DURATION);
void lockDoor();
void blinkLED(int count, int delayMs);
void initializeMQTT();
void maintainMQTT();
void onMQTTMessage(char* topic, byte* payload, unsigned int length);
bool connectToWiFi(const char *ssid, const char *password);

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n╔═══════════════════════════════════════╗");
  Serial.println("║  ESP-32 Door 3 Controller Booting...  ║");
  Serial.println("╚═══════════════════════════════════════╝\n");
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
  
  Serial.println("[INIT] Pins initialized");
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonISR, FALLING);
  
  if (!connectToWiFi(WIFI_SSID, WIFI_PASSWORD)) {
    while (1) { digitalWrite(LED_PIN, HIGH); delay(200); digitalWrite(LED_PIN, LOW); delay(200); }
  }
  
  Serial.println("✅ Setup complete!\n");
  initializeMQTT();
  blinkLED(3, 200);
}

void loop() {
  if (triggerAccess) { triggerAccess = false; unlockDoor(UNLOCK_DURATION); }
  maintainMQTT();
  delay(100);
}

void IRAM_ATTR buttonISR() {
  unsigned long currentTime = millis();
  if (currentTime - lastButtonPress > DEBOUNCE_TIME) { triggerAccess = true; lastButtonPress = currentTime; }
}

void unlockDoor(int duration) {
  Serial.println("🔓 UNLOCKING DOOR...");
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);
  delay(duration);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
  Serial.println("🔒 Door re-locked");
}

void lockDoor() {
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  currentDoorState = LOCKED;
}

void blinkLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

bool connectToWiFi(const char *ssid, const char *password) {
  Serial.printf("[WiFi] Connecting to: %s\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { delay(500); Serial.print("."); attempts++; }
  Serial.println();
  
  if (WiFi.status() != WL_CONNECTED) { Serial.println("[WiFi] ❌ Failed"); return false; }
  Serial.println("[WiFi] ✅ Connected!");
  return true;
}

void initializeMQTT() {
  espClient.setInsecure();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);
  
  if (mqttClient.connect("ESP32_Door_3", MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("[MQTT] ✅ Connected!");
    char topic[64];
    snprintf(topic, sizeof(topic), "doors/%d/unlock", DOOR_ID);
    mqttClient.subscribe(topic);
    Serial.printf("[MQTT] 📡 Subscribed to: %s\n", topic);
  }
}

void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String jsonStr = String((char*)payload).substring(0, length);
  if (jsonStr.indexOf("\"action\":\"UNLOCK\"") >= 0) {
    int durationIdx = jsonStr.indexOf("\"duration\"");
    int duration = UNLOCK_DURATION;
    if (durationIdx >= 0) {
      int colonIdx = jsonStr.indexOf(":", durationIdx);
      int commaIdx = jsonStr.indexOf(",", colonIdx);
      if (commaIdx < 0) commaIdx = jsonStr.indexOf("}", colonIdx);
      String durationStr = jsonStr.substring(colonIdx + 1, commaIdx);
      durationStr.trim();
      duration = durationStr.toInt();
    }
    unlockDoor(duration);
  }
}

void maintainMQTT() {
  if (!mqttClient.connected()) {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 5000) {
      lastReconnect = millis();
      if (mqttClient.connect("ESP32_Door_3", MQTT_USER, MQTT_PASSWORD)) {
        char topic[64];
        snprintf(topic, sizeof(topic), "doors/%d/unlock", DOOR_ID);
        mqttClient.subscribe(topic);
      }
    }
  } else {
    mqttClient.loop();
  }
}
