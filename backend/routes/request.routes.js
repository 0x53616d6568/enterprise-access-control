const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyRequests, getAllRequests,
  createRequest, reviewRequest
} = require('../controllers/request.controller');

router.get('/me',               authenticate, getMyRequests);
router.get('/',                 authenticate, authorize(3), getAllRequests);
router.post('/',                authenticate, createRequest);
router.patch('/:id/review',     authenticate, authorize(3), reviewRequest);

module.exports = router;
