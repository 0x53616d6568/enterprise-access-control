/**
 * MQTT Service for React Native
 * Handles token generation, access requests, and real-time updates
 */

import { api } from './apiService';
import { API } from '../constants/api';

// MQTT token lifecycle
export const mqttTokenService = {
  /**
   * Generate a new MQTT token
   */
  async generateToken(deviceName = 'Mobile Device') {
    try {
      const response = await api.post(API.MQTT_TOKEN_GENERATE, { deviceName });
      return response.data.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to generate token');
    }
  },

  /**
   * Get all MQTT tokens for current user
   */
  async getTokens() {
    try {
      const response = await api.get(API.MQTT_TOKENS);
      return response.data.data.tokens || [];
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to fetch tokens');
    }
  },

  /**
   * Revoke a specific MQTT token
   */
  async revokeToken(tokenId, reason = 'USER_REQUESTED') {
    try {
      const response = await api.post(`${API.MQTT_TOKEN}/${tokenId}/revoke`, { reason });
      return response.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to revoke token');
    }
  },

  /**
   * Revoke all MQTT tokens
   */
  async revokeAllTokens() {
    try {
      const response = await api.post(API.MQTT_TOKENS_REVOKE_ALL);
      return response.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to revoke all tokens');
    }
  }
};

// Door access request management (Prompted behavior)
export const mqttAccessService = {
  /**
   * Request access to a door - Simple endpoint for quick access requests
   * Creates an access request that managers can approve/deny
   * Skips time/day validation - manager reviews the request
   * 
   * @param {object} accessData - { door_id, door_name, user_id, user_name }
   * @returns {Promise<object>} { request_id, status }
   */
  async requestAccess(accessData) {
    try {
      const { door_id, door_name } = accessData;
      
      if (!door_id) {
        throw new Error('door_id is required');
      }

      // Use dedicated door-access endpoint (no time/day validation, manager reviews)
      const response = await api.post(`${API.MY_REQUESTS}/door-access`, {
        door_id: door_id,
        door_name: door_name || 'Unknown Door'
      });

      console.log('[Access] Request sent:', response.data);
      return response.data.data || response.data;
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to request access';
      console.error('[Access] Error:', errorMsg);
      throw new Error(errorMsg);
    }
  },

  /**
   * Request access to a door (user presses button)
   * Returns requestId and indicates if face auth is required
   */
  async requestDoorAccess(doorId, tokenId) {
    try {
      const response = await api.post(API.MQTT_REQUEST_ACCESS, {
        doorId,
        tokenId
      });
      return response.data.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to request access');
    }
  },

  /**
   * Submit face authentication for an access request
   */
  async submitFaceAuth(requestId, faceAuthPassed, faceEmbedding = null) {
    try {
      const payload = {
        faceAuthPassed,
        faceEmbedding
      };
      
      const response = await api.post(
        `${API.MQTT_REQUEST}/${requestId}/face-auth`,
        payload
      );
      return response.data.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Face authentication failed');
    }
  },

  /**
   * Get real-time status of an access request
   */
  async getRequestStatus(requestId) {
    try {
      const response = await api.get(`${API.MQTT_REQUEST}/${requestId}/status`);
      return response.data.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to get request status');
    }
  },

  /**
   * Poll for request status with retries
   * Useful for waiting for door response
   */
  async pollRequestStatus(requestId, maxRetries = 10, delayMs = 500) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const status = await this.getRequestStatus(requestId);
        
        // If status has changed from PENDING, return it
        if (status.status !== 'PENDING' && status.status !== 'FACE_AUTH_REQUIRED') {
          return status;
        }
        
        // Wait before next poll
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Return last known status if max retries reached
    return this.getRequestStatus(requestId);
  },

  /**
   * Get user's access request history
   */
  async getAccessHistory(limit = 50) {
    try {
      const response = await api.get(API.MQTT_REQUEST_HISTORY, {
        params: { limit }
      });
      return response.data.data.history || [];
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to fetch history');
    }
  }
};

/**
 * Complete door access flow:
 * 1. User sees list of accessible doors
 * 2. User presses "Request Access" button
 * 3. System requests access with token
 * 4. If face auth required, show camera UI
 * 5. Submit face auth result
 * 6. Poll for response from door
 * 7. Display result (granted or denied)
 */
export const mqttAccessFlow = {
  /**
   * Full access request workflow
   */
  async requestAccessWithAuth(doorId, tokenId, shouldUseFaceAuth = false, faceAuthCallback = null) {
    try {
      // Step 1: Create access request
      const request = await mqttAccessService.requestDoorAccess(doorId, tokenId);
      
      // Step 2: Check if face auth is required
      if (request.requiresFaceAuth || shouldUseFaceAuth) {
        // Call face auth callback if provided
        let faceAuthPassed = false;
        
        if (faceAuthCallback) {
          faceAuthPassed = await faceAuthCallback(request.requestId);
        }
        
        // Step 3: Submit face auth result
        const faceResult = await mqttAccessService.submitFaceAuth(
          request.requestId,
          faceAuthPassed
        );
        
        if (!faceAuthPassed) {
          return {
            success: false,
            status: 'FACE_AUTH_FAILED',
            message: 'Face authentication failed'
          };
        }
      }
      
      // Step 4: Poll for door response
      const finalStatus = await mqttAccessService.pollRequestStatus(request.requestId);
      
      return {
        success: finalStatus.access_result === 'GRANTED',
        status: finalStatus.status,
        requestId: request.requestId,
        message: finalStatus.access_result === 'GRANTED' 
          ? 'Access granted!' 
          : `Access denied: ${finalStatus.denial_reason || 'Unknown reason'}`
      };
    } catch (err) {
      return {
        success: false,
        status: 'ERROR',
        message: err.message
      };
    }
  }
};

export default {
  mqttTokenService,
  mqttAccessService,
  mqttAccessFlow
};
