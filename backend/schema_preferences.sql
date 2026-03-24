-- Create user_theme_preferences table
CREATE TABLE IF NOT EXISTS user_theme_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  theme ENUM('dark', 'light', 'system') DEFAULT 'dark',
  accent_color ENUM('blue', 'green', 'purple', 'orange') DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_theme (user_id)
);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  access_granted BOOLEAN DEFAULT TRUE,
  access_denied BOOLEAN DEFAULT TRUE,
  face_fail BOOLEAN DEFAULT TRUE,
  req_approved BOOLEAN DEFAULT TRUE,
  req_rejected BOOLEAN DEFAULT TRUE,
  new_request BOOLEAN DEFAULT FALSE,
  visitor_arrived BOOLEAN DEFAULT TRUE,
  visitor_expired BOOLEAN DEFAULT FALSE,
  token_expiry BOOLEAN DEFAULT TRUE,
  security_alert BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_notif (user_id)
);
