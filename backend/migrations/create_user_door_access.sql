-- Create table for individual user door access assignments
CREATE TABLE IF NOT EXISTS user_door_access (
  user_door_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  allowed_from TIME DEFAULT '00:00',
  allowed_until TIME DEFAULT '23:59',
  days_of_week VARCHAR(255) DEFAULT 'MON,TUE,WED,THU,FRI',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (door_id) REFERENCES doors(door_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_door (user_id, door_id)
);
