const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyAttendance,
  getUserAttendance,
  getAllAttendance,
  getCurrentStatus,
  checkIn,
  checkOut,
  getAttendanceLogs,
} = require('../controllers/attendance.controller');

// GET endpoints
router.get('/me',                   authenticate, getMyAttendance);
router.get('/user/:id',             authenticate, authorize(3), getUserAttendance);
router.get('/',                     authenticate, authorize(3), getAllAttendance);
router.get('/status/current',       authenticate, getCurrentStatus);
router.get('/logs/:attendance_id',  authenticate, getAttendanceLogs);

// POST endpoints (check-in/check-out)
router.post('/check-in',   authenticate, checkIn);
router.post('/check-out',  authenticate, checkOut);

module.exports = router;
