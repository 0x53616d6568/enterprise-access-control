// ESP-32 Door Controller - Example Tests & Utilities
// Use these sketches to test individual components

/**
 * TEST 1: Camera Test
 * Run this to verify camera is working
 */
/*
#include "esp_camera.h"

void setup() {
  Serial.begin(115200);
  
  // Minimal camera config
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = 5;
  config.pin_d1 = 18;
  config.pin_d2 = 19;
  config.pin_d3 = 21;
  config.pin_d4 = 36;
  config.pin_d5 = 39;
  config.pin_d6 = 34;
  config.pin_d7 = 35;
  config.pin_xclk = 0;
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sda = 26;
  config.pin_scl = 27;
  config.pin_pwdn = 32;
  config.pin_reset = -1;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_SVGA;
  config.jpeg_quality = 10;
  config.fb_count = 1;
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return;
  }
  
  Serial.println("Camera initialized!");
}

void loop() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb) {
    Serial.printf("Image captured: %d bytes\n", fb->len);
    esp_camera_fb_return(fb);
  } else {
    Serial.println("Capture failed");
  }
  delay(1000);
}
*/

/**
 * TEST 2: WiFi Test
 * Run this to verify WiFi connectivity
 */
/*
#include <WiFi.h>

#define SSID "Your_SSID"
#define PASS "Your_Password"

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== WiFi Test ===");
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("\nWiFi failed");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Signal: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("Not connected");
  }
  delay(5000);
}
*/

/**
 * TEST 3: GPIO Output Test
 * Run this to verify relay and LED control
 */
/*
void setup() {
  Serial.begin(115200);
  pinMode(12, OUTPUT);  // Relay
  pinMode(4, OUTPUT);   // LED
  pinMode(13, INPUT_PULLUP);  // Button
  
  Serial.println("=== GPIO Test ===");
  Serial.println("GPIO 12 (Relay) and GPIO 4 (LED) will toggle");
}

void loop() {
  // Test relay (GPIO 12)
  Serial.println("GPIO 12 HIGH (Relay off/lock)");
  digitalWrite(12, HIGH);
  digitalWrite(4, LOW);
  delay(2000);
  
  Serial.println("GPIO 12 LOW (Relay on/unlock)");
  digitalWrite(12, LOW);
  digitalWrite(4, HIGH);
  delay(2000);
  
  // Test button
  if (digitalRead(13) == LOW) {
    Serial.println("Button pressed!");
    delay(500);
  }
}
*/

/**
 * TEST 4: HTTP Request Test
 * Run this to verify API connectivity
 */
/*
#include <WiFi.h>
#include <HTTPClient.h>

#define SSID "Your_SSID"
#define PASS "Your_Password"
#define API_URL "https://Soapppp11-enterprise-access-control-face.hf.space/health"

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== HTTP Request Test ===");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected");
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  Serial.printf("Connecting to %s\n", API_URL);
  
  if (http.begin(client, API_URL)) {
    int httpCode = http.GET();
    Serial.printf("Response code: %d\n", httpCode);
    
    if (httpCode == 200) {
      String response = http.getString();
      Serial.printf("Response: %s\n", response.c_str());
    }
    
    http.end();
  } else {
    Serial.println("Failed to connect");
  }
}

void loop() {
  delay(5000);
}
*/

/**
 * TEST 5: JSON Parsing Test
 * Run this to verify ArduinoJson library
 */
/*
#include <ArduinoJson.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== JSON Test ===");
  
  // Simulate API response
  String jsonResponse = R"({
    "success": true,
    "face_detected": true,
    "confidence": 0.92,
    "user_id": "user123",
    "message": "Access granted"
  })";
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonResponse);
  
  if (error) {
    Serial.printf("JSON Error: %s\n", error.c_str());
    return;
  }
  
  Serial.printf("Success: %s\n", doc["success"] ? "true" : "false");
  Serial.printf("Face Detected: %s\n", doc["face_detected"] ? "true" : "false");
  Serial.printf("Confidence: %.2f\n", (float)doc["confidence"]);
  Serial.printf("User ID: %s\n", doc["user_id"].as<String>().c_str());
}

void loop() {}
*/

/**
 * TEST 6: Full Integration Test
 * Run this to test the complete door access workflow
 */
/*
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "camera_utils.h"
#include "network_utils.h"
#include "door_control.h"

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== FULL INTEGRATION TEST ===\n");
  
  // Test camera
  Serial.println("1. Testing camera...");
  if (initializeCamera()) {
    Serial.println("   ✓ Camera OK");
  } else {
    Serial.println("   ✗ Camera FAILED");
    return;
  }
  
  // Test WiFi
  Serial.println("2. Testing WiFi...");
  if (connectToWiFi(WIFI_SSID, WIFI_PASSWORD)) {
    Serial.println("   ✓ WiFi OK");
  } else {
    Serial.println("   ✗ WiFi FAILED");
    return;
  }
  
  // Test GPIO
  Serial.println("3. Testing GPIO...");
  pinMode(12, OUTPUT);
  pinMode(4, OUTPUT);
  digitalWrite(4, HIGH);
  delay(500);
  digitalWrite(4, LOW);
  Serial.println("   ✓ GPIO OK");
  
  // Test API connectivity
  Serial.println("4. Testing API connectivity...");
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  String url = String(FACE_SERVICE_URL) + "/health";
  if (http.begin(client, url)) {
    int code = http.GET();
    http.end();
    if (code == 200) {
      Serial.println("   ✓ API OK");
    } else {
      Serial.printf("   ✗ API returned %d\n", code);
    }
  } else {
    Serial.println("   ✗ API connection failed");
  }
  
  // Test relay
  Serial.println("5. Testing relay...");
  digitalWrite(12, LOW);
  delay(2000);
  digitalWrite(12, HIGH);
  Serial.println("   ✓ Relay OK");
  
  Serial.println("\n=== ALL TESTS COMPLETE ===\n");
}

void loop() {}
*/

/**
 * TEST 7: Timing & Performance Test
 */
/*
void setup() {
  Serial.begin(115200);
}

void loop() {
  unsigned long start = millis();
  
  // Simulate camera capture (200ms)
  delay(200);
  unsigned long afterCapture = millis();
  
  // Simulate API request (1500ms)
  delay(1500);
  unsigned long afterAPI = millis();
  
  Serial.printf("Capture time: %lu ms\n", afterCapture - start);
  Serial.printf("API time: %lu ms\n", afterAPI - afterCapture);
  Serial.printf("Total time: %lu ms\n", afterAPI - start);
  Serial.println();
  
  delay(1000);
}
*/

/**
 * TEST 8: Memory & Resource Monitoring
 */
/*
void setup() {
  Serial.begin(115200);
}

void loop() {
  Serial.printf("Free heap: %u bytes\n", ESP.getFreeHeap());
  Serial.printf("Largest free block: %u bytes\n", ESP.getMaxAllocHeap());
  Serial.printf("Flash size: %u bytes\n", ESP.getFlashChipSize());
  Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
  Serial.println();
  
  delay(5000);
}
*/

// ============================================
// How to use these tests:
// ============================================
// 
// 1. Copy one test section above
// 2. Uncomment it (remove the /* and */ wrapper)
// 3. Paste into Arduino IDE
// 4. Modify WiFi credentials as needed
// 5. Upload to ESP-32
// 6. Open Serial Monitor at 115200 baud
// 7. Observe output
//
// Run tests in order:
// 1. GPIO test first (no WiFi needed)
// 2. Camera test 
// 3. WiFi test
// 4. HTTP request test
// 5. JSON parsing test
// 6. Full integration test (all systems)
// 7. Performance test
// 8. Memory monitoring
//
// ============================================

// Notes:
// - All tests are non-blocking and loop-based
// - Modify delays to test rapid-fire requests
// - Monitor serial output for errors
// - Use Serial.printf() for formatted output
// - Tests assume config.h is available
//
// ============================================
