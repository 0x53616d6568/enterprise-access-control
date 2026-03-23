const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyVisitors, getAllVisitors,
  createVisitor, revokeVisitor
} = require('../controllers/visitor.controller');

router.get('/me',       authenticate, getMyVisitors);
router.get('/',         authenticate, authorize(3), getAllVisitors);
router.post('/',        authenticate, createVisitor);
router.patch('/:id/revoke', authenticate, revokeVisitor);

module.exports = router;
