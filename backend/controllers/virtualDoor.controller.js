/**
 * Virtual Door Controller
 * REST endpoints for managing virtual door
 */

const { getVirtualDoorState, triggerUnlockViaAPI } = require('../services/virtualDoorService');
const { success, error } = require('../utils/response');

/**
 * GET /api/virtual-door/status
 * Get current status of virtual door
 */
const getStatus = async (req, res, next) => {
  try {
    const doorState = getVirtualDoorState();
    return success(res, doorState, 'Virtual door status retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/virtual-door/unlock
 * Manually unlock virtual door (for manager/admin control)
 */
const unlock = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const userName = req.user.full_name;

    const result = await triggerUnlockViaAPI(userId, userName);
    
    return success(res, result, 'Virtual door unlocked', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  unlock
};
