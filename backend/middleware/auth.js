const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');

// Verify JWT and attach user to request
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { user_id, role_id, access_level }
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
};

// Role-based access guard
// Usage: authorize(3) — allows access_level >= 3 (Manager, Admin)
const authorize = (minAccessLevel) => {
  return (req, res, next) => {
    if (!req.user || req.user.access_level < minAccessLevel) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
