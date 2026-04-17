const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllDoors, getDoorById, getUserAccessibleDoors,
  getUsersForDoor, assignUserDoor, removeUserDoor,
  createDoor, updateDoor, deleteDoor,
  getAccessRules, setAccessRule, deleteAccessRule
} = require('../controllers/door.controller');

// User access routes
router.get('/access/my-doors',         authenticate, getUserAccessibleDoors);
router.get('/:id/users',               authenticate, authorize(5), getUsersForDoor);
router.post('/:id/assign-user',        authenticate, authorize(5), assignUserDoor);
router.delete('/:id/remove-user',      authenticate, authorize(5), removeUserDoor);

// Door management routes
router.get('/',                        authenticate, getAllDoors);
router.get('/:id',                     authenticate, getDoorById);
router.post('/',                       authenticate, authorize(5), createDoor);
router.put('/:id',                     authenticate, authorize(5), updateDoor);
router.delete('/:id',                  authenticate, authorize(5), deleteDoor);
router.get('/:id/rules',               authenticate, authorize(3), getAccessRules);
router.post('/:id/rules',              authenticate, authorize(5), setAccessRule);
router.delete('/:id/rules/:ruleId',    authenticate, authorize(5), deleteAccessRule);

module.exports = router;
