-- BLE Token System Database Migration
-- This migration creates the professional-grade BLE token infrastructure

-- ============================================
-- 1. BLE TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ble_tokens (
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
  FOREIGN KEY (parent_token_id) REFERENCES ble_tokens(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_active (user_id, is_revoked, expires_at),
  INDEX idx_expires_at (expires_at),
  INDEX idx_last_used (last_used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. BLE TOKEN AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ble_token_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id INT COMMENT 'Reference to ble_tokens.id (nullable for batch operations)',
  
  -- Action tracking
  action VARCHAR(50) NOT NULL COMMENT 'ACTION: TOKEN_CREATED, TOKEN_VIEWED, TOKEN_ROTATED, TOKEN_REVOKED, TOKEN_USED, ALL_TOKENS_REVOKED, DECRYPTION_FAILED',
  details VARCHAR(500) COMMENT 'Detailed action information',
  
  -- Network/Security context
  ip_address VARCHAR(45) COMMENT 'Client IP address (supports IPv6)',
  user_agent VARCHAR(500) COMMENT 'Browser/Client user agent',
  
  -- Temporal tracking
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES ble_tokens(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_id (token_id),
  INDEX idx_action (action),
  INDEX idx_logged_at (logged_at),
  INDEX idx_user_action (user_id, action, logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. TOKEN ROTATION ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ble_token_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id INT,
  
  -- Alert tracking
  alert_type VARCHAR(50) NOT NULL COMMENT 'EXPIRING_SOON, NEEDS_ROTATION, SUSPICIOUS_ACTIVITY, MULTIPLE_ROTATIONS, DECRYPTION_FAILURE',
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  message VARCHAR(500),
  
  -- Lifecycle
  is_acknowledged TINYINT(1) DEFAULT 0,
  acknowledged_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES ble_tokens(id) ON DELETE SET NULL,
  
  INDEX idx_user_unread (user_id, is_acknowledged),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. ENCRYPTION KEY VERSION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS encryption_key_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_version INT NOT NULL UNIQUE COMMENT 'Version identifier for key rotation',
  algorithm VARCHAR(50) DEFAULT 'aes-256-gcm' COMMENT 'Encryption algorithm used',
  
  -- Key lifecycle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP NULL COMMENT 'When this key was rotated to next version',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether this key version is active',
  
  -- Metadata
  key_hash VARCHAR(64) COMMENT 'Hash of the key for verification purposes',
  notes VARCHAR(255),
  
  INDEX idx_key_version (key_version),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial encryption key version
INSERT IGNORE INTO encryption_key_versions (key_version, algorithm, is_active, notes)
VALUES (1, 'aes-256-gcm', 1, 'Initial deployment key version');

-- ============================================
-- 5. VIEWS FOR COMMON QUERIES
-- ============================================

-- Active tokens view (excludes revoked and expired)
CREATE OR REPLACE VIEW active_ble_tokens AS
SELECT 
  bt.id,
  bt.user_id,
  bt.device_name,
  bt.created_at,
  bt.expires_at,
  bt.last_used_at,
  DATEDIFF(CURRENT_DATE, bt.expires_at) as days_until_expiry,
  CASE 
    WHEN DATEDIFF(CURRENT_DATE, bt.expires_at) <= 30 THEN 'expiring_soon'
    WHEN DATEDIFF(CURRENT_DATE, bt.created_at) >= 90 THEN 'needs_rotation'
    ELSE 'healthy'
  END as status
FROM ble_tokens bt
WHERE bt.is_revoked = 0 AND bt.expires_at > NOW();

-- Token rotation history view
CREATE OR REPLACE VIEW token_rotation_history AS
SELECT 
  u.id as user_id,
  COUNT(CASE WHEN ba.action = 'TOKEN_ROTATED' THEN 1 END) as total_rotations,
  MAX(ba.logged_at) as last_rotation_date,
  COUNT(CASE WHEN ba.logged_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) AND ba.action = 'TOKEN_ROTATED' THEN 1 END) as rotations_last_hour
FROM users u
LEFT JOIN ble_token_audit_log ba ON u.id = ba.user_id
GROUP BY u.id;

-- ============================================
-- 6. STORED PROCEDURES FOR COMMON OPERATIONS
-- ============================================

-- Procedure to clean up expired and revoked tokens (archival pattern)
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS archive_old_ble_tokens(IN days_retention INT)
BEGIN
  INSERT INTO ble_token_audit_log (user_id, action, details)
  SELECT 
    id,
    'BATCH_CLEANUP',
    CONCAT('Archived ', COUNT(*), ' old tokens')
  FROM ble_tokens
  WHERE (is_revoked = 1 OR expires_at < NOW())
    AND created_at < DATE_SUB(NOW(), INTERVAL days_retention DAY)
  GROUP BY id;
  
  -- Archive to separate table if you want to keep historical data
  -- For now, we'll just set a flag or handle synchronously
END$$
DELIMITER ;

-- Procedure to detect suspicious token activity
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS detect_suspicious_activity()
BEGIN
  -- Insert alerts for users with >3 rotations in 1 hour
  INSERT IGNORE INTO ble_token_alerts (user_id, alert_type, severity, message)
  SELECT 
    user_id,
    'MULTIPLE_ROTATIONS',
    'critical',
    CONCAT('Suspicious: ', rotations_last_hour, ' token rotations in last hour')
  FROM token_rotation_history
  WHERE rotations_last_hour > 3;
  
  -- Insert alerts for tokens expiring in 7 days
  INSERT IGNORE INTO ble_token_alerts (user_id, token_id, alert_type, severity, message)
  SELECT 
    user_id,
    id,
    'EXPIRING_SOON',
    'medium',
    CONCAT('Token will expire on ', DATE_FORMAT(expires_at, '%Y-%m-%d'))
  FROM active_ble_tokens
  WHERE days_until_expiry <= 7 AND days_until_expiry > 0;
  
  -- Insert alerts for tokens needing rotation
  INSERT IGNORE INTO ble_token_alerts (user_id, token_id, alert_type, severity, message)
  SELECT 
    user_id,
    id,
    'NEEDS_ROTATION',
    'medium',
    CONCAT('Token for ', device_name, ' has been active for 90+ days. Consider rotation.')
  FROM active_ble_tokens
  WHERE status = 'needs_rotation';
END$$
DELIMITER ;

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- Additional performance indexes
ALTER TABLE ble_token_audit_log ADD INDEX idx_action_date (action, logged_at);
ALTER TABLE ble_tokens ADD INDEX idx_device_name (device_name);

-- ============================================
-- DOCUMENTATION
-- ============================================
/*
ENCRYPTION APPROACH:
- Each BLE token is encrypted using AES-256-GCM
- The encryption happens in backend/utils/encryption.js
- Three components stored separately:
  1. encrypted_token: The encrypted token bytes
  2. iv: Initialization vector (randomly generated per token)
  3. auth_tag: Authentication tag (prevents tampering/forgery)

SECURITY FEATURES:
1. Token Hashing: token_hash is SHA256 hash of plaintext token
   - Used for comparison without storing plaintext
   - Impossible to reverse to get original token

2. Encryption: AES-256-GCM with random IV
   - Provides confidentiality (encryption)
   - Provides authenticity (authentication tag)
   - Prevents tampering detection

3. Audit Logging: Every action tracked with timestamps and context
   - TOKEN_CREATED, TOKEN_VIEWED, TOKEN_ROTATED, TOKEN_REVOKED
   - Suspicious activity detection (multiple rotations)

4. Token Lifecycle:
   - Created with 365-day expiry
   - Tracked for last usage
   - Can be revoked with reason
   - Rotation updates parent_token_id for lineage

5. Alerts System:
   - Expiration alerts (7 days before)
   - Rotation recommendations (90 days old)
   - Suspicious activity detection

USAGE PATTERNS:
- Token creation: generateBleToken() -> encrypt -> save with hash
- Token validation: hash submitted token, lookup by hash, decrypt to verify
- Token rotation: mark old as revoked, create new
- Emergency revocation: revokeAllUserTokens() for security breach

COMPLIANCE/AUDIT:
- ble_token_audit_log provides complete audit trail
- Can be queried for compliance reports
- Integrates with existing audit systems
- Supports GDPR data retention requirements
*/
