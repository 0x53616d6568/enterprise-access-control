const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllDoors, getDoorById,
  createDoor, updateDoor, deleteDoor,
  getAccessRules, setAccessRule, deleteAccessRule
} = require('../controllers/door.controller');

router.get('/',                        authenticate, getAllDoors);
router.get('/:id',                     authenticate, getDoorById);
router.post('/',                       authenticate, authorize(5), createDoor);
router.put('/:id',                     authenticate, authorize(5), updateDoor);
router.delete('/:id',                  authenticate, authorize(5), deleteDoor);
router.get('/:id/rules',               authenticate, authorize(3), getAccessRules);
router.post('/:id/rules',              authenticate, authorize(5), setAccessRule);
router.delete('/:id/rules/:ruleId',    authenticate, authorize(5), deleteAccessRule);

module.exports = router;
