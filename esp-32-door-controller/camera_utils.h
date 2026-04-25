#ifndef CAMERA_UTILS_H
#define CAMERA_UTILS_H

#include "esp_camera.h"
#include "config.h"

// Camera pin assignments for AI-THINKER
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

/**
 * Initialize camera with optimal settings
 */
bool initializeCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sda = SIOD_GPIO_NUM;
  config.pin_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE;
  config.jpeg_quality = 10;  // Lower = higher quality, larger file (10-63)
  config.fb_count = 1;
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }
  
  // Apply camera settings for face recognition
  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    // Settings optimized for face detection
    s->set_brightness(s, 0);        // Brightness
    s->set_contrast(s, 0);          // Contrast
    s->set_saturation(s, 0);        // Saturation
    s->set_special_effect(s, 0);    // No effects
    s->set_whitebal(s, 1);          // Auto white balance
    s->set_awb_gain(s, 1);          // Auto WB gain
    s->set_wb_mode(s, 0);           // WB mode
    s->set_expose_ctrl(s, 1);       // Auto exposure
    s->set_aec_value(s, 0);         // Exposure value
    s->set_gain_ctrl(s, 1);         // Auto gain
    s->set_agc_gain(s, 0);          // AGC gain
    s->set_gainceiling(s, (gainceiling_t)0);
    s->set_bpc(s, 0);               // Black pixel correction
    s->set_wpc(s, 1);               // White pixel correction
    s->set_raw_gma(s, 1);           // Raw Gamma
    s->set_lenc(s, 1);              // Lens correction
    s->set_hmirror(s, 0);           // No horizontal mirror
    s->set_vflip(s, 0);             // No vertical flip
    s->set_dcw(s, 1);               // DCW (Downsize)
  }
  
  Serial.println("Camera initialized successfully");
  return true;
}

/**
 * Capture image and return frame buffer
 * NOTE: Caller must call esp_camera_fb_return(fb) to free the buffer
 */
camera_fb_t* captureImage() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("ERROR: Camera capture failed");
    return NULL;
  }
  
  Serial.printf("Image captured - Size: %d bytes, Width: %d, Height: %d\n", 
                fb->len, fb->width, fb->height);
  return fb;
}

/**
 * Get image as base64 encoded string (for API requests)
 * Useful if API expects base64 encoded image data
 */
String imageToBase64(uint8_t *data, size_t len) {
  // Note: Implement base64 encoding if needed
  // For now, we send raw image data
  return "";
}

#endif // CAMERA_UTILS_H
