import { api } from './apiService';
import { API } from '../constants/api';

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
 * Flow:
 * 1. Capture image from camera (base64)
 * 2. Send to backend
 * 3. Backend sends to microservice for embedding extraction
 * 4. Microservice stores in database
 * 5. Backend stores in PostgreSQL
 * 
 * @param {number} userId - User ID to enroll
 * @param {string} base64Image - Base64 encoded image from camera
 * @returns {Promise<{user_id, enrolled_at, updated, message}>}
 */
export const enrollUserFace = async (userId, base64Image) => {
  if (!userId) throw new Error('User ID is required');
  if (!base64Image) throw new Error('Image data is required');

  try {
    const response = await api.post(API.FACE_ENROLL, {
      user_id: userId,
      image_base64: base64Image,
    });

    return response.data.data;
  } catch (err) {
    throw new Error(`Face enrollment failed: ${err.response?.data?.message || err.message}`);
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
