-- Migrate face_embeddings to support multiple embeddings per user
-- Step 1: Drop the existing table (if running fresh) or follow manual steps below
-- 
-- MANUAL MIGRATION PATH (for existing data):
-- 1. Backup your data: SELECT * FROM face_embeddings INTO OUTFILE '/backup/face_embeddings.sql';
-- 2. Drop old table: DROP TABLE IF EXISTS face_embeddings;
-- 3. Create new table (see below)
-- 4. Restore data if needed

-- Create face_embeddings table with support for multiple embeddings per user
CREATE TABLE IF NOT EXISTS face_embeddings (
  id              INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique identifier for each embedding',
  user_id         INT NOT NULL COMMENT 'Reference to users table',
  embedding       MEDIUMBLOB NOT NULL COMMENT 'Face embedding vector (512D, 2KB per face)',
  enrolled_at     DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When this face was enrolled',
  model_version   VARCHAR(20) DEFAULT 'arcface-r100' COMMENT 'Model version used',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id) COMMENT 'Fast lookup by user',
  INDEX idx_enrolled_at (enrolled_at) COMMENT 'Sort by enrollment date'
) ENGINE=InnoDB;

-- NOTE: This schema allows:
-- - One user to have multiple face embeddings (from different angles/distances)
-- - Each session with FaceEnrollmentScreen adds a new row
-- - Recognition checks ALL embeddings for a user to find best match
