-- Add push_token column to users table for storing Expo push notification tokens

ALTER TABLE users ADD COLUMN push_token VARCHAR(255) DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX idx_users_push_token ON users(push_token);

-- Add type column to notifications table to categorize them
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'DEFAULT';
