-- Create manager_team_members table for team assignment
CREATE TABLE IF NOT EXISTS manager_team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  manager_id INT NOT NULL,
  team_member_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_assignment (manager_id, team_member_id),
  FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (team_member_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_manager (manager_id),
  INDEX idx_member (team_member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for efficient manager team queries
CREATE INDEX idx_manager_team ON manager_team_members(manager_id, team_member_id);
