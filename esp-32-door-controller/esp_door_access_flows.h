/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║     ESP-32 Door Access Flows (Face Recognition Scenarios)    ║
 * ║                                                               ║
 * ║  Scenario 1: esp_test_embedding                              ║
 * ║    - Use pre-made test embedding (no camera needed)          ║
 * ║    - Send to backend for verification                        ║
 * ║                                                               ║
 * ║  Scenario 2: esp_camera_toHF                                 ║
 * ║    - Capture image from ESP camera                           ║
 * ║    - Send to HF Space for recognition                        ║
 * ║    - Result flows: ESP → Backend → HiveMQ → Door Unlock      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

#ifndef ESP_DOOR_ACCESS_FLOWS_H
#define ESP_DOOR_ACCESS_FLOWS_H

#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// Configuration
// ============================================

#define DOOR_ACCESS_REQUEST_ENDPOINT "/api/pi/door-access-request"
#define HF_SPACE_RECOGNIZE_ENDPOINT "/recognize"

// Similarity threshold for face recognition
#define FACE_SIMILARITY_THRESHOLD 0.6

// ============================================
// SCENARIO 1: esp_test_embedding
// ============================================

/**
 * Scenario 1: Door Request with Test Embedding (No Camera)
 * 
 * Flow:
 * 1. ESP triggers door request
 * 2. Send test embedding to backend
 * 3. Backend verifies embedding against enrolled faces
 * 4. Backend sends MQTT unlock if authorized
 * 
 * Use Case: Testing without camera hardware
 */
void esp_test_embedding_flow(int doorId = DOOR_ID, int userId = 0) {
  Serial.println("\n" + String(60, '='));
  Serial.println("🧪 SCENARIO 1: esp_test_embedding (No Camera)");
  Serial.println(String(60, '='));
  Serial.println("Flow: Button → Backend Face Check → MQTT Unlock");

  // Generate or use a test embedding
  // This is a placeholder - in real use, you'd load from EEPROM or generate
  String testEmbedding = generateTestEmbedding();
  
  if (testEmbedding.length() == 0) {
    Serial.println("❌ Failed to generate test embedding");
    return;
  }

  Serial.printf("📦 Test Embedding size: %d bytes\n", testEmbedding.length());

  // Prepare request payload
  DynamicJsonDocument doc(2048);
  doc["door_id"] = doorId;
  doc["user_id"] = userId;  // 0 means unknown user, backend will search
  
  JsonObject faceData = doc.createNestedObject("face_data");
  faceData["type"] = "embedding_test";
  faceData["embedding"] = testEmbedding;

  String payload;
  serializeJson(doc, payload);

  Serial.println("📤 Sending door access request to backend...");
  Serial.printf("   Endpoint: POST %s%s\n", BACKEND_API, DOOR_ACCESS_REQUEST_ENDPOINT);
  Serial.println("   Payload size: " + String(payload.length()) + " bytes");

  // Send to backend
  HTTPClient http;
  http.begin(String(BACKEND_API) + DOOR_ACCESS_REQUEST_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", BACKEND_API_KEY);  // From config.h

  int httpCode = http.POST(payload);
  String response = http.getString();

  Serial.printf("📥 Response Code: %d\n", httpCode);

  if (httpCode == 200) {
    // Parse response
    DynamicJsonDocument responseDoc(1024);
    DeserializationError error = deserializeJson(responseDoc, response);

    if (error) {
      Serial.println("❌ JSON parse error: " + String(error.c_str()));
      http.end();
      return;
    }

    if (responseDoc["data"]["granted"] == true) {
      Serial.println("✅ ACCESS GRANTED!");
      Serial.printf("   User ID: %d\n", responseDoc["data"]["user_id"].as<int>());
      Serial.printf("   Similarity: %.3f\n", responseDoc["data"]["similarity"].as<float>());
      Serial.println("   🔓 Door unlock command sent via MQTT");
      
      blinkLED(3, 200);  // Success pattern
      unlockDoor(UNLOCK_DURATION);
    } else {
      Serial.println("❌ ACCESS DENIED");
      Serial.println("   Reason: " + String(responseDoc["data"]["reason"].as<const char*>()));
      Serial.printf("   Similarity: %.3f\n", responseDoc["data"]["similarity"].as<float>());
      
      blinkLED(1, 500);  // Failure pattern
    }
  } else {
    Serial.printf("❌ HTTP Error: %d\n", httpCode);
    Serial.println("Response: " + response);
    blinkLED(5, 100);  // Error pattern
  }

  http.end();
  Serial.println(String(60, '=') + "\n");
}

/**
 * Generate a test embedding for demonstration
 * 
 * In production, you would:
 * - Load from EEPROM
 * - Capture from camera and extract embedding
 * - Or use a pre-made embedding from enrolled user
 * 
 * Returns base64 encoded 512-dim float32 vector
 */
String generateTestEmbedding() {
  // Create a simple test embedding (512 floats)
  float testEmbedding[512];
  
  // Initialize with small random values (will be normalized in microservice)
  for (int i = 0; i < 512; i++) {
    // Create a recognizable pattern: user1_embedding
    // In real use, this would be an actual face embedding
    testEmbedding[i] = (float)rand() / RAND_MAX * 0.1;
  }

  // Normalize the embedding
  float norm = 0;
  for (int i = 0; i < 512; i++) {
    norm += testEmbedding[i] * testEmbedding[i];
  }
  norm = sqrt(norm);
  
  if (norm > 0) {
    for (int i = 0; i < 512; i++) {
      testEmbedding[i] /= norm;
    }
  }

  // Convert to base64
  // Create a byte buffer from float array
  uint8_t embeddingBytes[512 * sizeof(float)];
  memcpy(embeddingBytes, testEmbedding, sizeof(testEmbedding));

  // Base64 encode
  String base64Embedding = base64_encode(embeddingBytes, sizeof(embeddingBytes));
  
  return base64Embedding;
}

// ============================================
// SCENARIO 2: esp_camera_toHF
// ============================================

/**
 * Scenario 2: Door Request with Camera Image to HF Space
 * 
 * Flow:
 * 1. ESP camera captures image
 * 2. Send image to HF Space for recognition
 * 3. Get embedding from HF Space
 * 4. Send embedding to backend for verification
 * 5. Backend sends MQTT unlock if authorized
 * 
 * Use Case: With ESP32 camera module
 */
void esp_camera_toHF_flow(int doorId = DOOR_ID) {
  Serial.println("\n" + String(60, '='));
  Serial.println("📷 SCENARIO 2: esp_camera_toHF (With Camera)");
  Serial.println(String(60, '='));
  Serial.println("Flow: Camera → HF Space → Backend → MQTT Unlock");

  // Step 1: Capture image from camera
  Serial.println("\n1️⃣ Capturing image from camera...");
  String cameraImage = captureAndEncodeImage();
  
  if (cameraImage.length() == 0) {
    Serial.println("❌ Failed to capture image");
    return;
  }

  Serial.printf("📸 Image captured: %d bytes (base64)\n", cameraImage.length());

  // Step 2: Send to HF Space for recognition
  Serial.println("\n2️⃣ Sending to HF Space for face recognition...");
  String hfResponse = callHFSpaceRecognize(cameraImage);

  if (hfResponse.length() == 0) {
    Serial.println("❌ HF Space call failed");
    return;
  }

  // Parse HF Space response
  DynamicJsonDocument hfDoc(1024);
  DeserializationError error = deserializeJson(hfDoc, hfResponse);

  if (error) {
    Serial.println("❌ Failed to parse HF Space response");
    return;
  }

  if (hfDoc["success"] != true) {
    Serial.println("❌ Face recognition failed: " + String(hfDoc["error"].as<const char*>()));
    blinkLED(2, 300);
    return;
  }

  int recognizedUserId = hfDoc["data"]["user_id"];
  float similarity = hfDoc["data"]["similarity"];

  Serial.printf("✅ Face recognized!\n");
  Serial.printf("   User ID: %d\n", recognizedUserId);
  Serial.printf("   Similarity: %.3f\n", similarity);

  // Step 3: Send to backend with recognized user
  Serial.println("\n3️⃣ Sending recognition result to backend...");

  DynamicJsonDocument doc(2048);
  doc["door_id"] = doorId;
  doc["user_id"] = recognizedUserId;
  
  JsonObject faceData = doc.createNestedObject("face_data");
  faceData["type"] = "camera_image";
  faceData["image_base64"] = cameraImage;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(String(BACKEND_API) + DOOR_ACCESS_REQUEST_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", BACKEND_API_KEY);

  int httpCode = http.POST(payload);
  String backendResponse = http.getString();

  Serial.printf("📥 Backend Response Code: %d\n", httpCode);

  if (httpCode == 200) {
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, backendResponse);

    if (responseDoc["data"]["granted"] == true) {
      Serial.println("✅ ACCESS GRANTED!");
      Serial.printf("   Door: %s\n", responseDoc["data"]["door_name"].as<const char*>());
      Serial.println("   🔓 Door unlock command sent via MQTT");
      
      blinkLED(3, 200);
      unlockDoor(UNLOCK_DURATION);
    } else {
      Serial.println("❌ ACCESS DENIED");
      blinkLED(2, 300);
    }
  } else {
    Serial.printf("❌ Backend Error: %d\n", httpCode);
    blinkLED(5, 100);
  }

  http.end();
  Serial.println(String(60, '=') + "\n");
}

/**
 * Call HF Space /recognize endpoint
 * Sends camera image and gets recognized user_id
 */
String callHFSpaceRecognize(String imageBase64) {
  Serial.println("🔗 Connecting to HF Space...");

  DynamicJsonDocument doc(1024 + imageBase64.length());
  doc["image_base64"] = imageBase64;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(String(FACE_SERVICE_URL) + HF_SPACE_RECOGNIZE_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  if (strlen(FACE_SERVICE_API_KEY) > 0) {
    http.addHeader("X-API-Key", FACE_SERVICE_API_KEY);
  }

  int httpCode = http.POST(payload);
  String response = http.getString();

  if (httpCode != 200) {
    Serial.printf("❌ HF Space Error: %d\n", httpCode);
    http.end();
    return "";
  }

  http.end();
  return response;
}

/**
 * Capture image from ESP camera and encode to base64
 * 
 * Requires: Camera module (OV2640, OV5640, etc.)
 * Dependencies: esp32-camera library
 */
String captureAndEncodeImage() {
  Serial.println("📷 Accessing camera...");

  // Note: This requires the camera to be initialized
  // See esp-32-door-controller/camera_utils.h for initialization

  // Capture frame
  camera_fb_t* fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("❌ Camera capture failed");
    return "";
  }

  Serial.printf("📸 Frame captured: %d bytes\n", fb->len);

  // Convert to base64
  String imageBase64 = base64_encode(fb->buf, fb->len);

  // Return frame buffer
  esp_camera_fb_return(fb);

  return imageBase64;
}

/**
 * Base64 encoding utility function
 * Encodes binary data to base64 string
 */
String base64_encode(uint8_t* data, size_t size) {
  static const char base64_chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  String result;
  int i = 0;
  unsigned char char_array_3[3];
  unsigned char char_array_4[4];

  while (size--) {
    char_array_3[i++] = *(data++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;

      for (i = 0; i < 4; i++)
        result += base64_chars[char_array_4[i]];
      i = 0;
    }
  }

  if (i) {
    for (int j = i; j < 3; j++)
      char_array_3[j] = '\0';

    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);

    for (int j = 0; j <= i; j++)
      result += base64_chars[char_array_4[j]];

    while (i++ < 3)
      result += '=';
  }

  return result;
}

// ============================================
// Menu: Select which scenario to test
// ============================================

void showDoorAccessMenu() {
  Serial.println("\n" + String(60, '='));
  Serial.println("🚪 DOOR ACCESS TEST MENU");
  Serial.println(String(60, '='));
  Serial.println("1. 🧪 Scenario 1: esp_test_embedding (no camera)");
  Serial.println("2. 📷 Scenario 2: esp_camera_toHF (with camera)");
  Serial.println("3. ↩️  Back to main menu");
  Serial.println(String(60, '='));
  Serial.print("Enter choice (1-3): ");
}

void handleDoorAccessMenu(char choice) {
  switch (choice) {
    case '1':
      esp_test_embedding_flow(DOOR_ID);
      break;
    case '2':
      // Check if camera is available
      if (!cameraInitialized) {
        Serial.println("⚠️  Camera not initialized. Please initialize camera first.");
        delay(2000);
      } else {
        esp_camera_toHF_flow(DOOR_ID);
      }
      break;
    case '3':
      break;
    default:
      Serial.println("❌ Invalid choice");
  }
}

#endif  // ESP_DOOR_ACCESS_FLOWS_H
