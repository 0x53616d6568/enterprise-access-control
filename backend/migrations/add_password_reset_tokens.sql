-- Migration: Add Password Reset Tokens Table
-- This table stores temporary tokens used for password reset requests

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(20) NOT NULL UNIQUE,
  is_used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at TIMESTAMP NULL,
  used_ip VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_token (user_id, token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clean up expired tokens (optional - run periodically)
DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND is_used = 0;

DESCRIBE password_reset_tokens;
