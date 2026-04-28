#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// WiFi Configuration
// ============================================
#define WIFI_SSID "MAXBOX5G_AFE0"  // Replace with your WiFi SSID
#define WIFI_PASSWORD "t3wkuygg7xxh"

// ============================================
// Face Recognition API Configuration
// ============================================
#define FACE_SERVICE_URL "https://Soapppp11-enterprise-access-control-face.hf.space"
#define FACE_SERVICE_API_KEY ""  // Leave empty if not required

// ============================================
// Door Control Configuration
// ============================================
#define DOOR_ID 1                // Door identifier (matches database door_id)
#define UNLOCK_DURATION 3000     // Milliseconds (3 seconds)
#define CONFIDENCE_THRESHOLD 0.6 // Minimum face match confidence (0.0 - 1.0)

// ============================================
// Camera Configuration
// ============================================
#define CAMERA_MODEL_AI_THINKER // Use AI-THINKER model (OV2640)
// Other options:
// #define CAMERA_MODEL_WROVER_KIT
// #define CAMERA_MODEL_M5STACK_PSRAM
// #define CAMERA_MODEL_M5STACK_V2_PSRAM
// #define CAMERA_MODEL_M5STACK_WIDE
// #define CAMERA_MODEL_M5STACK_ESP32CAM

// Camera frame size
#define FRAMESIZE FRAMESIZE_VGA  // 640x480 (balanced quality/size)
// Other options:
// #define FRAMESIZE FRAMESIZE_QVGA    // 320x240
// #define FRAMESIZE FRAMESIZE_SVGA    // 800x600

// ============================================
// Debug Configuration
// ============================================
#define DEBUG 1  // Set to 1 for verbose logging, 0 for minimal

#if DEBUG
  #define DEBUG_PRINT(x) Serial.println(x)
  #define DEBUG_PRINTF(fmt, ...) Serial.printf(fmt, __VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTF(fmt, ...)
#endif

#endif // CONFIG_H
