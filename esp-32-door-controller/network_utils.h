#ifndef NETWORK_UTILS_H
#define NETWORK_UTILS_H

#include <WiFi.h>
#include "config.h"

#define MAX_RECONNECT_ATTEMPTS 10
#define RECONNECT_DELAY 2000

/**
 * Connect to WiFi network
 */
bool connectToWiFi(const char *ssid, const char *password) {
  Serial.printf("\nConnecting to WiFi: %s\n", ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < MAX_RECONNECT_ATTEMPTS) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("\nFailed to connect to WiFi after %d attempts\n", MAX_RECONNECT_ATTEMPTS);
    return false;
  }
  
  Serial.printf("\nWiFi connected!");
  Serial.printf("\nIP address: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Signal strength: %d dBm\n", WiFi.RSSI());
  
  return true;
}

/**
 * Check if WiFi is still connected, attempt reconnect if needed
 */
bool ensureWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  
  Serial.println("WiFi connection lost, attempting to reconnect...");
  WiFi.reconnect();
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 5) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Failed to reconnect to WiFi");
    return false;
  }
  
  Serial.println("\nWiFi reconnected");
  return true;
}

/**
 * Get WiFi signal strength in dBm
 */
int getSignalStrength() {
  return WiFi.RSSI();
}

/**
 * Get signal strength as percentage (0-100)
 */
int getSignalStrengthPercent() {
  int rssi = WiFi.RSSI();
  if (rssi == 0) return 0;
  if (rssi >= -50) return 100;
  if (rssi <= -100) return 0;
  return 2 * (rssi + 100);
}

/**
 * Get current IP address
 */
String getLocalIP() {
  return WiFi.localIP().toString();
}

/**
 * Disconnect from WiFi
 */
void disconnectWiFi() {
  WiFi.disconnect(true); // true = turn off WiFi radio
  Serial.println("WiFi disconnected");
}

/**
 * Print WiFi debug info
 */
void printWiFiInfo() {
  Serial.println("\n=== WiFi Info ===");
  Serial.printf("SSID: %s\n", WiFi.SSID().c_str());
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
  Serial.printf("Subnet: %s\n", WiFi.subnetMask().toString().c_str());
  Serial.printf("DNS1: %s\n", WiFi.dnsIP(0).toString().c_str());
  Serial.printf("DNS2: %s\n", WiFi.dnsIP(1).toString().c_str());
  Serial.printf("Signal: %d dBm (%d%%)\n", WiFi.RSSI(), getSignalStrengthPercent());
}

#endif // NETWORK_UTILS_H
