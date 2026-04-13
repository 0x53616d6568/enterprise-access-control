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
  requestPasswordReset,
  verifyPasswordResetTokenEndpoint,
  passwordReset,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Standard auth endpoints
router.post('/login',                    login);
router.post('/refresh',                  refresh);
router.post('/logout',                   authenticate, logout);
router.get('/me',                        authenticate, getMe);
router.post('/change-password',          authenticate, changePassword);

// Password Reset endpoints (no auth required)
router.post('/password-reset-request',   requestPasswordReset);
router.post('/password-reset-verify',    verifyPasswordResetTokenEndpoint);
router.post('/password-reset',           passwordReset);

// BLE Token endpoints
router.get('/ble-token',                 authenticate, getBleToken);
router.get('/ble-tokens',                authenticate, listBleTokens);
router.post('/ble-token/rotate',         authenticate, rotateBleToken);
router.post('/ble-token/revoke',         authenticate, revokeBleTokenEndpoint);
router.post('/ble-tokens/revoke-all',    authenticate, revokeAllBleTokens);
router.get('/ble-token/rotation-check',  authenticate, checkBleTokenRotation);

module.exports = router;
