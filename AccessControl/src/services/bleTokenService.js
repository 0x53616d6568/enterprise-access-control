import { api } from './apiService'

/**
 * Generate BLE Token
 * Generates a new BLE token for the authenticated user
 * @returns {Promise<object>} Token details
 */
export const generateBLEToken = async (deviceName = 'Test Device') => {
  try {
    const response = await api.get(`${api.defaults.baseURL}/auth/ble-token?deviceName=${encodeURIComponent(deviceName)}`)
    console.log('✅ BLE Token generated:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Failed to generate BLE token:', error.message)
    throw error
  }
}

/**
 * Verify BLE Token with Door (Simulate Pi)
 * Tests if a BLE token grants access to a specific door
 * @param {string} tokenHash - The BLE token hash
 * @param {number} doorId - The door ID to check access for
 * @returns {Promise<object>} Access verification result
 */
export const verifyBLETokenAccess = async (tokenHash, doorId) => {
  try {
    const response = await api.post(`${api.defaults.baseURL}/pi/verify`, {
      token_hash: tokenHash,
      door_id: doorId,
    })
    console.log('✅ BLE Token verification result:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ BLE Token verification failed:', error.message)
    throw error
  }
}

/**
 * Log BLE Access Attempt (Simulate Pi)
 * Records an access attempt as if the Pi had verified it
 * @param {object} accessData - Access attempt data
 * @returns {Promise<object>} Log result
 */
export const logBLEAccessAttempt = async (accessData) => {
  try {
    const response = await api.post(`${api.defaults.baseURL}/pi/log`, {
      user_id: accessData.user_id,
      door_id: accessData.door_id,
      result: accessData.result || 'GRANTED',
      method: accessData.method || 'BLE',
      ble_token_id: accessData.ble_token_id,
      device_info: accessData.device_info || 'Test Android App',
      face_auth_result: 'SKIPPED',
      face_confidence: null,
      fallback_used: 0,
    })
    console.log('✅ Access attempt logged:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Failed to log access attempt:', error.message)
    throw error
  }
}

/**
 * Rotate BLE Token
 * Rotates (regenerates) an existing BLE token
 * @param {number} tokenId - The token ID to rotate
 * @returns {Promise<object>} New token details
 */
export const rotateBLEToken = async (tokenId) => {
  try {
    const response = await api.post(`${api.defaults.baseURL}/auth/ble-token/rotate`, {
      tokenId,
    })
    console.log('✅ BLE Token rotated:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Failed to rotate BLE token:', error.message)
    throw error
  }
}

/**
 * Get All BLE Tokens (for current user)
 * @returns {Promise<array>} List of BLE tokens
 */
export const getBLETokens = async () => {
  try {
    const response = await api.get(`${api.defaults.baseURL}/auth/ble-tokens`)
    console.log('✅ BLE Tokens retrieved:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Failed to retrieve BLE tokens:', error.message)
    throw error
  }
}
