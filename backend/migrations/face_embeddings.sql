-- Create face_embeddings table for storing face recognition data
CREATE TABLE IF NOT EXISTS face_embeddings (
  user_id       INT PRIMARY KEY,
  embedding     BLOB NOT NULL,
  enrolled_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  model_version VARCHAR(20) DEFAULT 'arcface-r100',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_face_embeddings_enrolled_at ON face_embeddings(enrolled_at);
