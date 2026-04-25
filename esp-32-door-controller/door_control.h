#ifndef DOOR_CONTROL_H
#define DOOR_CONTROL_H

#include "config.h"

// Door lock states
enum DoorState {
  LOCKED = 0,
  UNLOCKED = 1,
  UNLOCKING = 2,
  ERROR = 3
};

DoorState currentDoorState = LOCKED;

/**
 * Initialize door lock system
 */
void initializeDoor(int relayPin) {
  pinMode(relayPin, OUTPUT);
  // Lock the door on startup (HIGH = locked)
  digitalWrite(relayPin, HIGH);
  currentDoorState = LOCKED;
  Serial.println("Door lock initialized - LOCKED");
}

/**
 * Unlock the door for UNLOCK_DURATION milliseconds
 */
void unlockDoorTemporary() {
  Serial.println(">>> Unlocking door...");
  currentDoorState = UNLOCKING;
  
  // Energize relay (LOW = unlock)
  digitalWrite(12, LOW);
  
  // Keep unlocked for specified duration
  unsigned long unlockStart = millis();
  while (millis() - unlockStart < UNLOCK_DURATION) {
    delay(100);
  }
  
  // Re-lock door
  digitalWrite(12, HIGH);
  currentDoorState = LOCKED;
  Serial.println(">>> Door re-locked");
}

/**
 * Permanently unlock door (for maintenance mode)
 */
void unlockDoorPermanent() {
  Serial.println(">>> Permanently unlocking door (MAINTENANCE MODE)");
  digitalWrite(12, LOW);
  currentDoorState = UNLOCKED;
}

/**
 * Lock door
 */
void lockDoor() {
  Serial.println(">>> Locking door");
  digitalWrite(12, HIGH);
  currentDoorState = LOCKED;
}

/**
 * Get current door state
 */
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

/**
 * Get door state as integer (for logging)
 */
int getDoorState() {
  return (int)currentDoorState;
}

/**
 * Send door state to backend API (optional)
 * For logging/audit trail
 */
bool reportDoorState(const char *backendUrl, const char *userId, bool successful) {
  // This would be called to report access attempts to the backend
  // Example: POST /api/door/log with userId, success, timestamp, etc.
  return true;
}

/**
 * Emergency lock (forces door closed immediately)
 */
void emergencyLock() {
  Serial.println("!!! EMERGENCY LOCK ACTIVATED !!!");
  digitalWrite(12, HIGH);
  currentDoorState = LOCKED;
}

/**
 * Check door sensor (if installed)
 * Returns true if door is physically open
 */
bool isDoorPhysicallyOpen(int sensorPin) {
  // Implement if using a door position sensor
  return digitalRead(sensorPin) == HIGH;
}

#endif // DOOR_CONTROL_H
