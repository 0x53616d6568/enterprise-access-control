/**
 * ESP-32 Door Controller - Serial Image Test
 * 
 * For testing door access WITHOUT ESP-32-CAM hardware
 * Receives image data via serial from PC test script
 * 
 * Upload this to regular ESP-32 (not ESP-32-CAM)
 * Then run: python test_door_access_serial.py image.jpg
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "network_utils.h"
#include "door_control.h"

// Pin definitions (no camera needed)
#define RELAY_PIN 12           // Door lock relay
#define BUTTON_PIN 13          // Manual trigger button
#define LED_PIN 4              // Status LED

// Global state
volatile bool triggerAccess = false;
unsigned long lastButtonPress = 0;
const unsigned long DEBOUNCE_TIME = 500;

// Serial image buffer
#define MAX_IMAGE_SIZE 100000  // 100KB max image
uint8_t imageBuffer[MAX_IMAGE_SIZE];
size_t imageSize = 0;
bool imageReady = false;

// Face recognition response structure
struct FaceResponse {
  bool success;
  bool faceDetected;
  float confidence;
  String userId;
  String message;
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== ESP-32 Door Access Controller (Serial Test Mode) ===");
  Serial.println("Running WITHOUT camera hardware");
  Serial.println("Ready to receive images via serial");
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Set relay to locked (HIGH = locked)
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  
  // Attach button interrupt
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonISR, FALLING);
  
  // Connect to WiFi
  if (!connectToWiFi(WIFI_SSID, WIFI_PASSWORD)) {
    Serial.println("FATAL: WiFi connection failed!");
    while (1) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }
  
  Serial.println("Setup complete!");
  Serial.println("Commands:");
  Serial.println("  TRIGGER - Simulate button press");
  Serial.println("  STATUS - Show door status");
  Serial.println("  IMAGE_START - Begin image upload");
  blinkLED(3, 200);
}

void loop() {
  // Handle serial commands
  if (Serial.available()) {
    handleSerialCommand();
  }
  
  // Handle access request (button or serial command)
  if (triggerAccess) {
    triggerAccess = false;
    handleAccessRequest();
  }
  
  // Check for incoming image data
  if (imageReady) {
    imageReady = false;
    handleImageUpload();
  }
  
  delay(100);
}

/**
 * ISR for button press
 */
void IRAM_ATTR buttonISR() {
  unsigned long currentTime = millis();
  if (currentTime - lastButtonPress > DEBOUNCE_TIME) {
    triggerAccess = true;
    lastButtonPress = currentTime;
  }
}

/**
 * Handle serial commands from PC
 */
void handleSerialCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  Serial.printf("\nReceived command: %s\n", command.c_str());
  
  if (command == "TRIGGER") {
    Serial.println(">> Simulating access request");
    triggerAccess = true;
  }
  else if (command == "STATUS") {
    printStatus();
  }
  else if (command == "IMAGE_START") {
    Serial.println(">> Ready to receive image");
    Serial.println("   Send binary image data followed by newline");
    imageSize = 0;
  }
  else if (command == "UNLOCK") {
    Serial.println(">> Manual unlock command");
    unlockDoor();
  }
  else if (command == "LOCK") {
    Serial.println(">> Manual lock command");
    lockDoor();
  }
  else if (command == "HELP") {
    printHelp();
  }
  else {
    Serial.println("Unknown command. Type HELP for commands.");
  }
}

/**
 * Handle image upload via serial
 */
void handleImageUpload() {
  Serial.printf("Received image: %d bytes\n", imageSize);
  
  if (imageSize == 0) {
    Serial.println("ERROR: Empty image");
    return;
  }
  
  if (imageSize > MAX_IMAGE_SIZE) {
    Serial.println("ERROR: Image too large");
    return;
  }
  
  Serial.println("Processing image...");
  processImage(imageBuffer, imageSize);
}

/**
 * Main access request handler
 * For serial test: use dummy image data if needed
 */
void handleAccessRequest() {
  Serial.println("\n--- Access Request Triggered ---");
  digitalWrite(LED_PIN, HIGH); // Turn on LED during processing
  
  // In serial test mode, we skip camera capture
  // Instead, we wait for image data from serial
  
  Serial.println("Waiting for image data...");
  Serial.println("Paste image data or use: python test_door_access_serial.py image.jpg");
  
  // Wait for image with timeout
  unsigned long startTime = millis();
  while (imageSize == 0 && millis() - startTime < 10000) {
    if (Serial.available()) {
      uint8_t byte = Serial.read();
      if (imageSize < MAX_IMAGE_SIZE) {
        imageBuffer[imageSize++] = byte;
      }
    }
    delay(10);
  }
  
  if (imageSize == 0) {
    Serial.println("ERROR: No image received (timeout)");
    blinkLED(5, 100);
    digitalWrite(LED_PIN, LOW);
    return;
  }
  
  // Process the image
  processImage(imageBuffer, imageSize);
  digitalWrite(LED_PIN, LOW);
}

/**
 * Process image and send to face recognition API
 */
void processImage(uint8_t *imageData, size_t size) {
  Serial.printf("\nProcessing image (%d bytes)\n", size);
  
  // Send to face recognition API
  Serial.println("Sending to face recognition service...");
  FaceResponse response = sendToFaceRecognition(imageData, size);
  
  // Process response
  Serial.println("\n--- Response Received ---");
  Serial.printf("Success: %s\n", response.success ? "true" : "false");
  Serial.printf("Face Detected: %s\n", response.faceDetected ? "true" : "false");
  Serial.printf("Confidence: %.2f%%\n", response.confidence * 100);
  Serial.printf("User ID: %s\n", response.userId.c_str());
  Serial.printf("Message: %s\n", response.message.c_str());
  
  // Control door based on response
  if (response.success && response.faceDetected && response.confidence >= CONFIDENCE_THRESHOLD) {
    Serial.println("\n✓ ACCESS GRANTED");
    unlockDoor();
    blinkLED(3, 300);
  } else {
    Serial.println("\n✗ ACCESS DENIED");
    blinkLED(10, 100);
  }
  
  // Reset image buffer
  imageSize = 0;
}

/**
 * Send image to HuggingFace Spaces face recognition service
 */
FaceResponse sendToFaceRecognition(uint8_t *imageData, size_t imageSize) {
  FaceResponse response = {false, false, 0.0, "", "Failed"};
  
  HTTPClient http;
  WiFiClientSecure client;
  
  // Allow insecure HTTPS if needed (for testing)
  client.setInsecure();
  
  // Prepare request
  String url = String(FACE_SERVICE_URL) + "/predict";
  Serial.printf("Connecting to: %s\n", url.c_str());
  
  if (!http.begin(client, url)) {
    Serial.println("ERROR: Failed to connect to face service");
    return response;
  }
  
  // Set headers
  http.addHeader("Content-Type", "image/jpeg");
  
  // Add API key if required
  if (strlen(FACE_SERVICE_API_KEY) > 0) {
    http.addHeader("Authorization", String("Bearer ") + FACE_SERVICE_API_KEY);
  }
  
  // Send request with image data
  int httpCode = http.sendRequest("POST", imageData, imageSize);
  
  if (httpCode != 200) {
    Serial.printf("ERROR: HTTP %d response\n", httpCode);
    http.end();
    return response;
  }
  
  // Parse JSON response
  String jsonResponse = http.getString();
  Serial.printf("Response: %s\n", jsonResponse.c_str());
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonResponse);
  
  if (error) {
    Serial.printf("JSON parsing error: %s\n", error.c_str());
    http.end();
    return response;
  }
  
  // Extract response fields
  response.success = doc["success"] | false;
  response.faceDetected = doc["face_detected"] | false;
  response.confidence = doc["confidence"] | 0.0;
  response.userId = doc["user_id"] | "";
  response.message = doc["message"] | "Unknown response";
  
  http.end();
  return response;
}

/**
 * Print help menu
 */
void printHelp() {
  Serial.println("\n=== Serial Test Commands ===");
  Serial.println("TRIGGER     - Start access request");
  Serial.println("STATUS      - Show current status");
  Serial.println("UNLOCK      - Manual unlock door");
  Serial.println("LOCK        - Manual lock door");
  Serial.println("IMAGE_START - Begin image data upload");
  Serial.println("HELP        - Show this menu");
}

/**
 * Print current status
 */
void printStatus() {
  Serial.println("\n=== System Status ===");
  Serial.printf("Door state: %s\n", getDoorStateString().c_str());
  Serial.printf("WiFi: %s\n", (WiFi.status() == WL_CONNECTED) ? "Connected" : "Disconnected");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal: %d dBm\n", WiFi.RSSI());
  }
  Serial.printf("Image buffer: %d / %d bytes\n", imageSize, MAX_IMAGE_SIZE);
}

/**
 * Blink LED for status indication
 */
void blinkLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
