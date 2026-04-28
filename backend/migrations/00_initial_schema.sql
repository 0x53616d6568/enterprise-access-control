/**
 * Initial Database Schema for SecureApp
 * Creates all core tables for door access control system
 * 
 * Run this FIRST before any other migrations
 */

-- ================================================
-- USERS & AUTHENTICATION
-- ================================================

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  avatar_url VARCHAR(500),
  role_id INT,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- ROLES & PERMISSIONS
-- ================================================

CREATE TABLE IF NOT EXISTS roles (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(100) UNIQUE NOT NULL,
  access_level INT DEFAULT 0,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_access_level (access_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- DOORS
-- ================================================

CREATE TABLE IF NOT EXISTS doors (
  door_id INT PRIMARY KEY AUTO_INCREMENT,
  door_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  door_type ENUM('standard', 'emergency', 'restricted') DEFAULT 'standard',
  requires_face_auth BOOLEAN DEFAULT 0,
  requires_approval BOOLEAN DEFAULT 0,
  relay_pin INT,
  led_pin INT,
  mqtt_topic VARCHAR(255),
  status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_type (door_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- USER DOOR ACCESS CONTROL
-- ================================================

CREATE TABLE IF NOT EXISTS user_door_access (
  user_door_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  allowed_from TIME,
  allowed_until TIME,
  days_of_week VARCHAR(50),
  access_type ENUM('unlimited', 'time_restricted', 'day_restricted') DEFAULT 'unlimited',
  requires_face_auth BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_door (user_id, door_id),
  INDEX idx_user (user_id),
  INDEX idx_door (door_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- ACCESS REQUESTS / DOOR UNLOCK LOG
-- ================================================

CREATE TABLE IF NOT EXISTS access_requests (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  request_type ENUM('mqtt', 'face_auth', 'manual', 'api') DEFAULT 'mqtt',
  status ENUM('PENDING', 'FACE_AUTH_REQUIRED', 'ACCESS_GRANTED', 'ACCESS_DENIED') DEFAULT 'PENDING',
  face_auth_required BOOLEAN DEFAULT 0,
  access_result VARCHAR(50),
  face_confidence FLOAT,
  face_match_user_id INT,
  ip_address VARCHAR(45),
  device_info VARCHAR(500),
  request_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_door (door_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_request_type (request_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- MQTT TOKENS
-- ================================================

CREATE TABLE IF NOT EXISTS mqtt_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  device_name VARCHAR(255),
  token VARCHAR(500) UNIQUE NOT NULL,
  is_revoked BOOLEAN DEFAULT 0,
  revoke_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  last_used_at TIMESTAMP NULL,
  INDEX idx_user (user_id),
  INDEX idx_token (token),
  INDEX idx_expired (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- USER SESSIONS
-- ================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  device_id VARCHAR(255),
  auth_token VARCHAR(500),
  is_active BOOLEAN DEFAULT 1,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE KEY unique_user_device (user_id, device_id),
  INDEX idx_user (user_id),
  INDEX idx_active (is_active),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- ACTIVITY LOGS
-- ================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INT,
  details JSON,
  ip_address VARCHAR(45),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- INSERT DEFAULT ROLES
-- ================================================

INSERT IGNORE INTO roles (role_id, role_name, access_level, description) VALUES
(1, 'User', 1, 'Standard user with basic door access'),
(2, 'Manager', 3, 'Manager with team management capabilities'),
(3, 'Administrator', 5, 'Full system administrator access');

-- ================================================
-- INSERT SAMPLE DOORS
-- ================================================

INSERT IGNORE INTO doors (door_id, door_name, location, door_type, requires_face_auth, mqtt_topic, status) VALUES
(1, 'Main Entrance', 'Building A, Level 1', 'standard', 0, 'doors/1/unlock', 'active'),
(2, 'Server Room', 'Building A, Basement', 'restricted', 1, 'doors/2/unlock', 'active'),
(3, 'Executive Office', 'Building A, Level 5', 'standard', 0, 'doors/3/unlock', 'active');

-- ================================================
-- SCHEMA COMPLETE
-- ================================================

SET FOREIGN_KEY_CHECKS=1;
