const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getMyNotifications, markAsRead, markAllAsRead
} = require('../controllers/notification.controller');

router.get('/',              authenticate, getMyNotifications);
router.patch('/:id/read',    authenticate, markAsRead);
router.patch('/read-all',    authenticate, markAllAsRead);

module.exports = router;
