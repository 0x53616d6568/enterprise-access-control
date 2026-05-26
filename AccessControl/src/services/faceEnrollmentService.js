import { api } from './apiService';
import { API } from '../constants/api';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

/**
 * Face Recognition Service
 * Frontend integration with Face Recognition Microservice
 * 
 * Architecture:
 * Frontend → Node.js Backend → Python Microservice (Raspberry Pi)
 * 
 * The microservice handles all face model operations:
 * - Face detection & embedding extraction (InsightFace/ArcFace)
 * - Face recognition & similarity comparison
 * - Embedding storage & retrieval
 */

/**
 * Enroll a user's face profile
 * 
 * Supports both single and multi-frame enrollment:
 * - Single frame: Send one image for quick enrollment
 * - Multi-frame: Send 3-5 frames for better accuracy (recommended)
 * 
 * Flow:
 * 1. Capture image(s) from camera (base64)
 * 2. Send to backend (single or array)
 * 3. Backend sends each to microservice for embedding extraction
 * 4. Backend averages embeddings for multi-frame mode
 * 5. Backend stores in PostgreSQL
 * 
 * @param {number} userId - User ID to enroll
 * @param {string|string[]} imageBase64 - Base64 encoded image(s) from camera
 * @returns {Promise<{user_id, enrolled_at, frames_processed, message}>}
 */
export const enrollUserFace = async (userId, imageBase64) => {
  if (!userId) throw new Error('User ID is required');
  if (!imageBase64) throw new Error('Image data is required');

  try {
    // Support both single image and array of images
    const isMultiFrame = Array.isArray(imageBase64);
    const payload = {
      user_id: userId,
    };

    if (isMultiFrame) {
      payload.images_base64 = imageBase64;
      console.log(`Enrolling user ${userId} with ${imageBase64.length} frames (multi-frame mode)`);
    } else {
      payload.image_base64 = imageBase64;
      console.log(`Enrolling user ${userId} with single frame`);
    }

    // Use axios with longer timeout for multi-frame enrollment
    // Single frame: 30s, Multi-frame (3 frames): 3 min (upload + 3x processing time)
    const timeout = isMultiFrame ? 180000 : 30000;
    
    // Create custom axios instance with extended timeout for this request
    const customApi = axios.create({
      baseURL: API.BASE_URL,
      timeout: timeout,
    });

    // Copy token from secure store if available
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        customApi.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Could not retrieve auth token:', e.message);
    }

    console.log(`Face enrollment timeout: ${timeout}ms (${isMultiFrame ? 'multi-frame' : 'single-frame'})`);
    const response = await customApi.post(API.FACE_ENROLL, payload);

    return response.data.data;
  } catch (err) {
    // Provide more specific error messages based on error type
    if (err.message?.includes('timeout')) {
      throw new Error('Face processing took too long. This can happen with large images.\n\nPlease try again with a clearer photo.');
    }
    
    if (err.response?.status === 404) {
      throw new Error('User not found in database.');
    }
    
    if (err.response?.status === 400) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error;
      if (errorMsg?.includes('No face detected')) {
        throw new Error('No face detected in image.\n\nMake sure:\n• Your face is clearly visible\n• Good lighting\n• Face fills 30-50% of frame\n• Remove glasses/mask if needed');
      }
      throw new Error(errorMsg || 'Invalid request. Please try again.');
    }

    if (err.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    }

    // Network or other errors
    throw new Error(
      err.response?.data?.message || 
      err.response?.data?.error || 
      err.message || 
      'Face enrollment failed. Please check your connection and try again.'
    );
  }
};

/**
 * Recognize face in image
 * Returns the most similar user from database
 * 
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<{user_id, similarity, is_authorized, threshold}>}
 */
export const recognizeFaceInImage = async (base64Image) => {
  if (!base64Image) throw new Error('Image data is required');

  try {
    const response = await api.post(API.FACE_RECOGNIZE, {
      image_base64: base64Image,
    });

    return response.data.data;
  } catch (err) {
    throw new Error(`Face recognition failed: ${err.response?.data?.message || err.message}`);
  }
};

/**
 * Get user's face embedding (stored in database)
 * 
 * @param {number} userId - User ID to retrieve embedding for
 * @returns {Promise<{user_id, embedding, enrolled_at, model_version}>}
 */
export const getFaceEmbedding = async (userId) => {
  if (!userId) throw new Error('User ID is required');

  try {
    const response = await api.get(API.FACE_GET(userId));
    return response.data.data;
  } catch (err) {
    if (err.response?.status === 404) {
      return null; // No face profile
    }
    throw new Error(`Failed to retrieve face embedding: ${err.response?.data?.message || err.message}`);
  }
};

/**
 * Check if user has face profile enrolled
 * 
 * @param {number} userId - User ID to check
 * @returns {Promise<{user_id, enrolled, enrolled_at?, model_version?}>}
 */
export const checkFaceEnrollmentStatus = async (userId) => {
  if (!userId) throw new Error('User ID is required');

  try {
    const response = await api.get(API.FACE_STATUS(userId));
    return response.data.data;
  } catch (err) {
    throw new Error(`Failed to check face enrollment status: ${err.response?.data?.message || err.message}`);
  }
};

/**
 * Delete user's face profile
 * 
 * @param {number} userId - User ID whose face profile to delete
 * @returns {Promise<{message}>}
 */
export const deleteFaceProfile = async (userId) => {
  if (!userId) throw new Error('User ID is required');

  try {
    const response = await api.delete(API.FACE_DELETE(userId));
    return response.data.data;
  } catch (err) {
    throw new Error(`Failed to delete face profile: ${err.response?.data?.message || err.message}`);
  }
};

/**
 * Get multiple face embeddings (batch retrieval)
 * 
 * @param {number[]} userIds - Array of user IDs
 * @returns {Promise<Array<{user_id, embedding, enrolled_at, model_version}>>}
 */
export const getBatchFaceEmbeddings = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds must be a non-empty array');
  }

  try {
    const response = await api.post(API.FACE_BATCH, { user_ids: userIds });
    return response.data.data;
  } catch (err) {
    throw new Error(`Failed to retrieve batch face embeddings: ${err.response?.data?.message || err.message}`);
  }
};

export default {
  enrollUserFace,
  recognizeFaceInImage,
  getFaceEmbedding,
  checkFaceEnrollmentStatus,
  deleteFaceProfile,
  getBatchFaceEmbeddings,
};
