const express = require('express');
const router  = express.Router();
const { login, refresh, logout, getMe, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login',           login);
router.post('/refresh',         refresh);
router.post('/logout',          authenticate, logout);
router.get('/me',               authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
