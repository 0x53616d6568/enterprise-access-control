const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyAttendance, getUserAttendance, getAllAttendance
} = require('../controllers/attendance.controller');

router.get('/me',        authenticate, getMyAttendance);
router.get('/user/:id',  authenticate, authorize(3), getUserAttendance);
router.get('/',          authenticate, authorize(3), getAllAttendance);

module.exports = router;
