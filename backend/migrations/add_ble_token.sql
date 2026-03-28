-- Add BLE token columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ble_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS ble_token_expiry DATETIME;

-- Create index for ble_token lookups
CREATE INDEX IF NOT EXISTS idx_ble_token ON users(ble_token);
