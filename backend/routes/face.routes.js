const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  enrollFace,
  getFaceEmbedding,
  recognizeFace,
  deleteFaceProfile,
  getBatchFaceEmbeddings,
  getFaceEnrollmentStatus,
} = require('../controllers/face.controller');

// Enroll face profile (admin/manager enrolling users)
router.post('/enroll', authenticate, authorize(3), enrollFace);

// Recognize face in image (everyone can use for authentication)
router.post('/recognize', authenticate, recognizeFace);

// Get face embedding for a user (admin/manager/user own profile)
router.get('/:user_id', authenticate, getFaceEmbedding);

// Check face enrollment status
router.get('/status/:user_id', authenticate, getFaceEnrollmentStatus);

// Get multiple face embeddings (batch retrieval)
router.post('/batch', authenticate, getBatchFaceEmbeddings);

// Delete face profile (admin only or user own)
router.delete('/:user_id', authenticate, authorize(3), deleteFaceProfile);

module.exports = router;
