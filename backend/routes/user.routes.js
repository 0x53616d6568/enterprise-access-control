const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllUsers, getUserById, createUser,
  updateUser, deleteUser, updatePushToken
} = require('../controllers/user.controller');

router.get('/',             authenticate, authorize(3), getAllUsers);
router.get('/:id',          authenticate, getUserById);
router.post('/',            authenticate, authorize(5), createUser);
router.put('/:id',          authenticate, updateUser);
router.delete('/:id',       authenticate, authorize(5), deleteUser);
router.post('/push-token',  authenticate, updatePushToken);

module.exports = router;
