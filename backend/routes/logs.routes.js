const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllLogs, getMyLogs, getLogsByDoor } = require('../controllers/logs.controller');

router.get('/',          authenticate, authorize(3), getAllLogs);
router.get('/me',        authenticate, getMyLogs);
router.get('/door/:id',  authenticate, authorize(3), getLogsByDoor);

module.exports = router;
