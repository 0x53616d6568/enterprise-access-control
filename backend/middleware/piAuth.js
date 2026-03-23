const { error } = require('../utils/response');

// API key guard for Raspberry Pi endpoints
const piAuthenticate = (req, res, next) => {
  const apiKey = req.headers['x-pi-api-key'];
  if (!apiKey || apiKey !== process.env.PI_API_KEY) {
    return error(res, 'Unauthorized Pi request', 401);
  }
  next();
};

module.exports = { piAuthenticate };
