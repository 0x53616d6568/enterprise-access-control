const express = require('express');
const router  = express.Router();
const {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  getBleToken,
  listBleTokens,
  rotateBleToken,
  revokeBleTokenEndpoint,
  revokeAllBleTokens,
  checkBleTokenRotation,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Standard auth endpoints
router.post('/login',                    login);
router.post('/refresh',                  refresh);
router.post('/logout',                   authenticate, logout);
router.get('/me',                        authenticate, getMe);
router.post('/change-password',          authenticate, changePassword);

// BLE Token endpoints
router.get('/ble-token',                 authenticate, getBleToken);
router.get('/ble-tokens',                authenticate, listBleTokens);
router.post('/ble-token/rotate',         authenticate, rotateBleToken);
router.post('/ble-token/revoke',         authenticate, revokeBleTokenEndpoint);
router.post('/ble-tokens/revoke-all',    authenticate, revokeAllBleTokens);
router.get('/ble-token/rotation-check',  authenticate, checkBleTokenRotation);

module.exports = router;
