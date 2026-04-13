import { api } from './apiService'

/**
 * Request Password Reset Email
 * Sends a password reset link to the user's email
 * @param {string} email - User's email address
 * @returns {Promise<object>} Response from server
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/auth/password-reset-request', { email })
    console.log('✅ Password reset email requested')
    return response.data
  } catch (error) {
    console.error('❌ Password reset request failed:', error.message)
    throw error
  }
}

/**
 * Resend Verification Email
 * Resends welcome email with new temporary password (requires authentication)
 * @returns {Promise<object>} Response from server
 */
export const resendVerificationEmail = async () => {
  try {
    const response = await api.post('/auth/resend-verification-email')
    console.log('✅ Verification email resent')
    return response.data
  } catch (error) {
    console.error('❌ Resend verification failed:', error.message)
    throw error
  }
}
