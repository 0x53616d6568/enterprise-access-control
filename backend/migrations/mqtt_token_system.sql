-- MQTT Token System Database Migration
-- This migration creates the professional-grade MQTT token infrastructure for door access
-- Replaces automatic BLE proximity-based access with prompted MQTT-based access

-- ============================================
-- 1. MQTT TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mqtt_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA256 hash of token for verification',
  encrypted_token LONGBLOB NOT NULL COMMENT 'AES-256-GCM encrypted token',
  iv VARCHAR(32) NOT NULL COMMENT 'Initialization vector (hex-encoded)',
  auth_tag VARCHAR(32) NOT NULL COMMENT 'Authentication tag for GCM (hex-encoded)',
  device_name VARCHAR(255) COMMENT 'Device identifier (e.g., "iPhone 13 Pro")',
  
  -- Lifecycle tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL COMMENT 'Token expiration date',
  last_used_at DATETIME COMMENT 'Last authentication timestamp',
  
  -- Revocation tracking
  is_revoked TINYINT(1) DEFAULT 0 COMMENT 'Soft delete for revoked tokens',
  revoked_at DATETIME COMMENT 'When token was revoked',
  revoked_reason VARCHAR(50) COMMENT 'Reason for revocation (ROTATED, USER_REQUESTED, COMPROMISED, DECRYPTION_FAILED, ALL_REVOKED)',
  
  -- Security audit
  rotation_count INT DEFAULT 0 COMMENT 'Number of times this lineage was rotated',
  parent_token_id INT COMMENT 'Reference to previous token if rotated',
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_token_id) REFERENCES mqtt_tokens(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_active (user_id, is_revoked, expires_at),
  INDEX idx_expires_at (expires_at),
  INDEX idx_last_used (last_used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. MQTT ACCESS REQUESTS TABLE (Prompted Behavior)
-- ============================================
CREATE TABLE IF NOT EXISTS mqtt_access_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  token_id INT NOT NULL,
  
  -- Request status
  status ENUM('PENDING', 'VERIFIED', 'FACE_AUTH_REQUIRED', 'FACE_AUTH_PASSED', 'FACE_AUTH_FAILED', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'EXPIRED') DEFAULT 'PENDING',
  
  -- Face authentication
  requires_face_auth TINYINT(1) DEFAULT 0,
  face_auth_attempts INT DEFAULT 0,
  face_auth_passed TINYINT(1) DEFAULT 0,
  face_auth_timestamp DATETIME,
  
  -- Request details
  request_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response_timestamp DATETIME,
  door_unlock_timestamp DATETIME COMMENT 'When door was actually unlocked',
  
  -- Security tracking
  mqtt_topic VARCHAR(255),
  pi_device_id VARCHAR(255),
  access_result VARCHAR(50) COMMENT 'GRANTED, DENIED, EXPIRED, FACE_AUTH_FAILED',
  denial_reason VARCHAR(255),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES mqtt_tokens(id) ON DELETE CASCADE,
  
  INDEX idx_user_door (user_id, door_id),
  INDEX idx_status (status),
  INDEX idx_timestamp (request_timestamp),
  INDEX idx_user_timestamp (user_id, request_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. MQTT TOKEN AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mqtt_token_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id INT COMMENT 'Reference to mqtt_tokens.id',
  
  -- Action tracking
  action VARCHAR(50) NOT NULL COMMENT 'TOKEN_CREATED, TOKEN_USED, TOKEN_ROTATED, TOKEN_REVOKED, ACCESS_REQUESTED, ACCESS_GRANTED, ACCESS_DENIED, FACE_AUTH_PASSED, FACE_AUTH_FAILED',
  details VARCHAR(500) COMMENT 'Detailed action information',
  access_request_id INT,
  
  -- Timestamp
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES mqtt_tokens(id) ON DELETE SET NULL,
  FOREIGN KEY (access_request_id) REFERENCES mqtt_access_requests(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. MQTT DOOR CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mqtt_door_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  door_id INT NOT NULL UNIQUE,
  
  -- MQTT Configuration
  mqtt_request_topic VARCHAR(255) NOT NULL COMMENT 'Topic to publish access requests to',
  mqtt_response_topic VARCHAR(255) NOT NULL COMMENT 'Topic to subscribe to for responses',
  mqtt_face_auth_topic VARCHAR(255) COMMENT 'Topic for face auth requests if needed',
  
  -- Door behavior
  request_timeout_seconds INT DEFAULT 30 COMMENT 'How long to wait for door response',
  auto_unlock TINYINT(1) DEFAULT 0 COMMENT 'Auto-unlock without face if not required',
  
  -- Security settings
  require_verification TINYINT(1) DEFAULT 1 COMMENT 'Always require backend verification',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  
  INDEX idx_door_id (door_id),
  UNIQUE KEY uq_mqtt_topics (mqtt_request_topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. VIEWS
-- ============================================
CREATE OR REPLACE VIEW active_mqtt_tokens AS
SELECT 
  mt.id,
  mt.user_id,
  mt.token_hash,
  mt.device_name,
  mt.created_at,
  mt.expires_at,
  mt.last_used_at,
  u.full_name,
  u.email,
  CASE 
    WHEN mt.is_revoked = 1 THEN 'revoked'
    WHEN mt.expires_at < NOW() THEN 'expired'
    ELSE 'active'
  END as token_status
FROM mqtt_tokens mt
JOIN users u ON mt.user_id = u.user_id
WHERE mt.is_revoked = 0 AND (mt.expires_at IS NULL OR mt.expires_at > NOW());

-- ============================================
-- 6. STORED PROCEDURES
-- ============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS archive_old_mqtt_tokens(IN days_retention INT)
BEGIN
  INSERT INTO mqtt_token_audit_log (user_id, token_id, action, details)
  SELECT 
    user_id, 
    id, 
    'TOKEN_ARCHIVED',
    CONCAT('Token archived - inactive for ', days_retention, ' days')
  FROM mqtt_tokens
  WHERE is_revoked = 0 
    AND last_used_at < DATE_SUB(NOW(), INTERVAL days_retention DAY);
  
  UPDATE mqtt_tokens
  SET is_revoked = 1, revoked_reason = 'ARCHIVED'
  WHERE is_revoked = 0 
    AND last_used_at < DATE_SUB(NOW(), INTERVAL days_retention DAY);
END //

CREATE PROCEDURE IF NOT EXISTS get_user_mqtt_activity(IN p_user_id INT, IN p_days INT)
BEGIN
  SELECT 
    mar.id as request_id,
    d.door_name,
    d.location,
    mar.status,
    mar.requires_face_auth,
    mar.face_auth_passed,
    mar.request_timestamp,
    mar.access_result,
    COUNT(*) OVER(PARTITION BY DATE(mar.request_timestamp)) as daily_requests
  FROM mqtt_access_requests mar
  JOIN doors d ON mar.door_id = d.door_id
  WHERE mar.user_id = p_user_id
    AND mar.request_timestamp > DATE_SUB(NOW(), INTERVAL p_days DAY)
  ORDER BY mar.request_timestamp DESC;
END //

DELIMITER ;
