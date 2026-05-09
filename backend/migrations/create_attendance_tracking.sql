/**
 * Attendance Tracking & Access Logs
 * Tracks check-in/check-out times and door access events
 * Links access logs to attendance records for detailed tracking
 */

-- ================================================
-- ATTENDANCE TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  check_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out TIMESTAMP NULL,
  total_hours DECIMAL(5, 2) NULL,
  status ENUM('present', 'absent', 'on_leave') DEFAULT 'present',
  notes VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, check_in),
  INDEX idx_user (user_id),
  INDEX idx_door (door_id),
  INDEX idx_check_in (check_in),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- ACCESS LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS access_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  attendance_id INT NULL,
  access_method ENUM('mqtt', 'face_auth', 'ble', 'manual', 'api') DEFAULT 'mqtt',
  result ENUM('granted', 'denied', 'expired', 'invalid') DEFAULT 'granted',
  face_confidence FLOAT,
  face_match_user_id INT,
  ip_address VARCHAR(45),
  device_info VARCHAR(500),
  reason VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  FOREIGN KEY (attendance_id) REFERENCES attendance(attendance_id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_door (door_id),
  INDEX idx_result (result),
  INDEX idx_timestamp (timestamp),
  INDEX idx_attendance (attendance_id),
  INDEX idx_method (access_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- SCHEMA COMPLETE
-- ================================================

SET FOREIGN_KEY_CHECKS=1;
