/*
  C-ESP-door.ino
  Single-file ESP32 MQTT door controller for 3 DC motors and 3 LEDs.

  Live door IDs from the database:
    1 = Main Entrance
    2 = Engineering Floor
    3 = Server Room
    4 = Armory
    5 = CEO
    6 = FABLAB
    7 = Salle 103
    8 = Test Door

  Topic pattern:
    doors/<id>/control

  Example payload:
    {
      "action": "UNLOCK",
      "duration_ms": 1200,
      "door_id": 1
    }

  Door ID is read from the MQTT topic. The payload can optionally repeat it.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =========================
// WiFi / MQTT Configuration
// =========================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Set to 1 to connect to WiFi/MQTT but simulate motors/LEDs in Serial Monitor
#define MQTT_SIMULATION_MODE 1

// Set to 1 to test from Serial Monitor only, without WiFi/MQTT
#define SERIAL_ONLY_TEST_MODE 0

#define MQTT_HOST "bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USERNAME "YOUR_MQTT_USERNAME"
#define MQTT_PASSWORD "YOUR_MQTT_PASSWORD"
#define MQTT_CLIENT_ID "C-ESP-door-controller"
#define MQTT_SUB_TOPIC "doors/+/control"
#define MQTT_STATUS_TOPIC_PREFIX "doors"
#define MQTT_USE_TLS 1
#define MQTT_TLS_INSECURE 1

// =========================
// Motion Configuration
// =========================
#define DEFAULT_PULSE_MS 1200
#define STATUS_LED_ON HIGH
#define STATUS_LED_OFF LOW
#define MOTOR_ON HIGH
#define MOTOR_OFF LOW

struct DoorChannel {
  uint8_t id;
  uint8_t motorPinA;
  uint8_t motorPinB;
  uint8_t ledPin;
  const char* name;
  bool active;
  bool opening;
  unsigned long activeUntil;
};

DoorChannel doors[] = {
  {1, 25, 26, 13, "Door 1", false, false, 0},
  {2, 27, 14, 33, "Door 2", false, false, 0},
  {3, 18, 19, 32, "Door 3", false, false, 0}
};

const size_t DOOR_COUNT = sizeof(doors) / sizeof(doors[0]);

WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

unsigned long lastWifiAttempt = 0;
unsigned long lastMqttAttempt = 0;
const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long MQTT_RETRY_MS = 3000;

// -------------------------
// Helper functions
// -------------------------
DoorChannel* findDoor(uint8_t doorId) {
  for (size_t i = 0; i < DOOR_COUNT; i++) {
    if (doors[i].id == doorId) {
      return &doors[i];
    }
  }
  return nullptr;
}

String getStatusTopic(uint8_t doorId) {
  return String(MQTT_STATUS_TOPIC_PREFIX) + "/" + String(doorId) + "/status";
}

String getEventTopic(uint8_t doorId) {
  return String(MQTT_STATUS_TOPIC_PREFIX) + "/" + String(doorId) + "/events";
}

void publishDoorStatus(DoorChannel& door, const char* state, const char* action, unsigned long durationMs) {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["door_id"] = door.id;
  doc["door_name"] = door.name;
  doc["state"] = state;
  doc["action"] = action;
  doc["duration_ms"] = durationMs;
  doc["millis"] = millis();

  char payload[256];
  size_t len = serializeJson(doc, payload, sizeof(payload));
  mqttClient.publish(getStatusTopic(door.id).c_str(), (const uint8_t*)payload, len, false);
}

void publishDoorEvent(DoorChannel& door, const char* eventName, const char* details) {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["door_id"] = door.id;
  doc["door_name"] = door.name;
  doc["event"] = eventName;
  doc["details"] = details;
  doc["millis"] = millis();

  char payload[256];
  size_t len = serializeJson(doc, payload, sizeof(payload));
  mqttClient.publish(getEventTopic(door.id).c_str(), (const uint8_t*)payload, len, false);
}

void stopDoor(DoorChannel& door) {
  clearMotorPins(door);
  writeLedPin(door, false);
  door.active = false;
  door.opening = false;
  door.activeUntil = 0;
  publishDoorStatus(door, "IDLE", "STOP", 0);
}

void startDoorPulse(DoorChannel& door, bool opening, unsigned long durationMs) {
  // Stop first so direction changes are safe.
  clearMotorPins(door);
  writeMotorPins(door, opening);
  writeLedPin(door, true);
  door.active = true;
  door.opening = opening;
  door.activeUntil = millis() + durationMs;

  publishDoorStatus(door, opening ? "MOVING_OPEN" : "MOVING_CLOSE", opening ? "UNLOCK" : "LOCK", durationMs);
  publishDoorEvent(door, opening ? "OPEN_PULSE_STARTED" : "CLOSE_PULSE_STARTED", "Motor energized");
}

String upperCopy(String value) {
  value.trim();
  value.toUpperCase();
  return value;
}

void clearMotorPins(const DoorChannel& door) {
  if (MQTT_SIMULATION_MODE) {
    Serial.printf("[SIM] Motor pins %u/%u -> OFF\n", door.motorPinA, door.motorPinB);
    return;
  }

  digitalWrite(door.motorPinA, MOTOR_OFF);
  digitalWrite(door.motorPinB, MOTOR_OFF);
}

void writeMotorPins(const DoorChannel& door, bool opening) {
  if (MQTT_SIMULATION_MODE) {
    Serial.printf("[SIM] Motor %s -> pin %u=%s, pin %u=%s\n",
                  opening ? "OPEN" : "CLOSE",
                  door.motorPinA, opening ? "HIGH" : "LOW",
                  door.motorPinB, opening ? "LOW" : "HIGH");
    return;
  }

  if (opening) {
    digitalWrite(door.motorPinA, MOTOR_ON);
    digitalWrite(door.motorPinB, MOTOR_OFF);
  } else {
    digitalWrite(door.motorPinA, MOTOR_OFF);
    digitalWrite(door.motorPinB, MOTOR_ON);
  }
}

void writeLedPin(const DoorChannel& door, bool on) {
  if (MQTT_SIMULATION_MODE) {
    Serial.printf("[SIM] LED pin %u -> %s\n", door.ledPin, on ? "ON" : "OFF");
    return;
  }

  digitalWrite(door.ledPin, on ? STATUS_LED_ON : STATUS_LED_OFF);
}

void printSerialHelp() {
  Serial.println();
  Serial.println("Serial test commands:");
  Serial.println("  HELP");
  Serial.println("  OPEN <doorId> [durationMs]");
  Serial.println("  CLOSE <doorId> [durationMs]");
  Serial.println("  STOP <doorId>");
  Serial.println("  PING <doorId>");
  Serial.println("Examples:");
  Serial.println("  OPEN 1 1200");
  Serial.println("  CLOSE 2 1000");
  Serial.println("  STOP 3");
  Serial.println();
}

void printDoorMapping() {
  Serial.println("Door mapping:");
  for (size_t i = 0; i < DOOR_COUNT; i++) {
    Serial.printf("  %u -> %s (motor %u/%u, led %u)\n", doors[i].id, doors[i].name, doors[i].motorPinA, doors[i].motorPinB, doors[i].ledPin);
  }
}

void runLocalDoorAction(uint8_t doorId, const String& action, unsigned long durationMs) {
  DoorChannel* door = findDoor(doorId);
  if (door == nullptr) {
    Serial.printf("Unknown door id: %u\n", doorId);
    return;
  }

  String normalized = upperCopy(action);
  Serial.printf("Local test -> door %u (%s), action=%s, duration=%lu\n", doorId, door->name, normalized.c_str(), durationMs);

  if (normalized == "OPEN" || normalized == "UNLOCK") {
    startDoorPulse(*door, true, durationMs);
  } else if (normalized == "CLOSE" || normalized == "LOCK") {
    startDoorPulse(*door, false, durationMs);
  } else if (normalized == "STOP") {
    stopDoor(*door);
  } else if (normalized == "PING") {
    Serial.printf("Door %u is %s\n", doorId, door->active ? "active" : "idle");
  } else {
    Serial.println("Unknown action. Use OPEN, CLOSE, STOP, or PING.");
  }
}

void handleSerialInput() {
  if (!Serial.available()) {
    return;
  }

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) {
    return;
  }

  String command = upperCopy(line);
  if (command == "HELP") {
    printSerialHelp();
    printDoorMapping();
    return;
  }

  int firstSpace = line.indexOf(' ');
  if (firstSpace < 0) {
    Serial.println("Invalid command. Type HELP.");
    return;
  }

  String action = line.substring(0, firstSpace);
  String rest = line.substring(firstSpace + 1);
  rest.trim();

  int secondSpace = rest.indexOf(' ');
  String doorIdText = secondSpace >= 0 ? rest.substring(0, secondSpace) : rest;
  String durationText = secondSpace >= 0 ? rest.substring(secondSpace + 1) : "";

  uint8_t doorId = (uint8_t)doorIdText.toInt();
  unsigned long durationMs = durationText.length() > 0 ? (unsigned long)durationText.toInt() : DEFAULT_PULSE_MS;

  if (doorId == 0) {
    Serial.println("Door ID must be a number greater than 0.");
    return;
  }

  runLocalDoorAction(doorId, action, durationMs);
}

bool extractDoorIdFromTopic(const char* topic, uint8_t& doorId) {
  int parsedId = 0;
  if (sscanf(topic, "doors/%d/control", &parsedId) == 1 && parsedId > 0) {
    doorId = static_cast<uint8_t>(parsedId);
    return true;
  }
  return false;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed");
  }
}

void publishBootStatus() {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["device"] = MQTT_CLIENT_ID;
  doc["ip"] = WiFi.localIP().toString();
  doc["status"] = "ONLINE";
  doc["doors"] = DOOR_COUNT;

  char payload[256];
  size_t len = serializeJson(doc, payload, sizeof(payload));
  mqttClient.publish("doors/controller/status", (const uint8_t*)payload, len, false);
}

void connectMqtt() {
  if (mqttClient.connected()) {
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setBufferSize(512);

#if MQTT_USE_TLS
  secureClient.setInsecure();
#endif

  Serial.print("Connecting to MQTT broker...");
  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println("connected");
    mqttClient.subscribe(MQTT_SUB_TOPIC);
    Serial.printf("Subscribed to %s\n", MQTT_SUB_TOPIC);
    publishBootStatus();
    for (size_t i = 0; i < DOOR_COUNT; i++) {
      publishDoorStatus(doors[i], "IDLE", "BOOT", 0);
    }
  } else {
    Serial.printf("failed, rc=%d\n", mqttClient.state());
  }
}

// -------------------------
// MQTT callback
// -------------------------
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  uint8_t doorId = 0;

  if (!extractDoorIdFromTopic(topic, doorId)) {
    Serial.printf("Ignoring topic: %s\n", topic);
    return;
  }

  DoorChannel* door = findDoor(doorId);
  if (door == nullptr) {
    Serial.printf("No actuator configured for door_id=%u\n", doorId);
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("JSON parse error: %s\n", err.c_str());
    publishDoorEvent(*door, "INVALID_JSON", err.c_str());
    return;
  }

  String action = upperCopy(doc["action"] | "UNLOCK");
  unsigned long durationMs = doc["duration_ms"] | DEFAULT_PULSE_MS;
  uint8_t payloadDoorId = doc["door_id"] | doc["doorId"] | doorId;

  if (payloadDoorId != doorId) {
    Serial.printf("Topic door_id=%u does not match payload door_id=%u\n", doorId, payloadDoorId);
    publishDoorEvent(*door, "DOOR_ID_MISMATCH", "Payload door_id does not match topic");
    return;
  }

  Serial.printf("MQTT: %s -> door %u action=%s duration=%lu\n", topic, doorId, action.c_str(), durationMs);

  if (action == "UNLOCK" || action == "OPEN") {
    startDoorPulse(*door, true, durationMs);
  } else if (action == "LOCK" || action == "CLOSE") {
    startDoorPulse(*door, false, durationMs);
  } else if (action == "STOP") {
    stopDoor(*door);
    publishDoorEvent(*door, "STOP_REQUESTED", "Motor stopped by MQTT");
  } else if (action == "PING") {
    publishDoorStatus(*door, door->active ? (door->opening ? "MOVING_OPEN" : "MOVING_CLOSE") : "IDLE", "PING", 0);
  } else {
    Serial.printf("Unknown action: %s\n", action.c_str());
    publishDoorEvent(*door, "UNKNOWN_ACTION", action.c_str());
  }
}

void maintainMqtt() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (!mqttClient.connected()) {
    if (millis() - lastMqttAttempt >= MQTT_RETRY_MS) {
      lastMqttAttempt = millis();
      connectMqtt();
    }
  } else {
    mqttClient.loop();
  }
}

void updateDoorStates() {
  unsigned long now = millis();
  for (size_t i = 0; i < DOOR_COUNT; i++) {
    DoorChannel& door = doors[i];
    if (door.active && now >= door.activeUntil) {
      stopDoor(door);
      publishDoorEvent(door, door.opening ? "OPEN_PULSE_FINISHED" : "CLOSE_PULSE_FINISHED", "Motor pulse completed");
    }
  }
}

void setupPins() {
  for (size_t i = 0; i < DOOR_COUNT; i++) {
    pinMode(doors[i].motorPinA, OUTPUT);
    pinMode(doors[i].motorPinB, OUTPUT);
    pinMode(doors[i].ledPin, OUTPUT);
    clearMotorPins(doors[i]);
    writeLedPin(doors[i], false);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("====================================");
  Serial.println(" C-ESP-door MQTT Controller Starting");
  Serial.println("====================================");

  setupPins();

  if (SERIAL_ONLY_TEST_MODE) {
    Serial.println("Serial-only test mode enabled.");
    printDoorMapping();
    printSerialHelp();
  } else {
    if (MQTT_SIMULATION_MODE) {
      Serial.println("MQTT simulation mode enabled: WiFi/MQTT connect, motors/LEDs are simulated only.");
    }

    connectWifi();

    mqttClient.setCallback(onMqttMessage);
    connectMqtt();

    Serial.println("Ready. Waiting for MQTT requests...");
    Serial.println("Topic format: doors/<id>/control");
  }
}

void loop() {
  if (SERIAL_ONLY_TEST_MODE) {
    handleSerialInput();
  } else {
    if (WiFi.status() != WL_CONNECTED) {
      if (millis() - lastWifiAttempt >= WIFI_RETRY_MS) {
        lastWifiAttempt = millis();
        connectWifi();
      }
    }

    maintainMqtt();
  }

  updateDoorStates();
}
