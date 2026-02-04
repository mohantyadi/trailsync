/**
 * Authentication Middleware
 * Currently uses API key for single-user mode
 * Structured to easily migrate to JWT-based multi-user authentication
 */

const apiKeyAuth = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No API key provided.'
    });
  }
  
  // Verify API key
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }
  
  // Future: When migrating to multi-user:
  // 1. Replace this with JWT verification
  // 2. Extract user ID from token
  // 3. Attach user to request: req.user = decoded
  
  next();
};

/**
 * JWT Authentication Middleware (for future use)
 * Uncomment and implement when adding multi-user support
 */
/*
const jwt = require('jsonwebtoken');

const jwtAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

module.exports = { apiKeyAuth, jwtAuth };
*/

module.exports = apiKeyAuth;
