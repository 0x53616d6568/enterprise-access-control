/**
 * Face Recognition Service
 * Routes requests through backend API (which proxies to HF Spaces microservice)
 */

import { API } from '../constants/api';

export const FaceService = {
  /**
   * Enroll a face for a user
   * @param {number} userId - User ID
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Promise} Enrollment result with embedding
   */
  enrollFace: async (userId, imageBase64) => {
    try {
      const response = await fetch(`${API.BASE_URL}/face/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          image_base64: imageBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Face enrollment failed');
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Face enrollment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Recognize a face in an image
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Promise} Recognition result with matched user_id and similarity
   */
  recognizeFace: async (imageBase64) => {
    try {
      const response = await fetch(`${API.BASE_URL}/face/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Face recognition failed');
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Face recognition error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Check face enrollment status for a user
   * @param {number} userId - User ID
   * @returns {Promise} Enrollment status
   */
  getFaceStatus: async (userId) => {
    try {
      const response = await fetch(`${API.BASE_URL}/face/status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get face status');
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Face status check error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Delete face profile for a user
   * @param {number} userId - User ID
   * @returns {Promise} Deletion result
   */
  deleteFace: async (userId) => {
    try {
      const response = await fetch(`${API.BASE_URL}/face/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Face deletion failed');
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Face deletion error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default FaceService;
