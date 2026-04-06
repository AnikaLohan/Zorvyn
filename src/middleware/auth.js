const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { error } = require('../utils/response');
const { getDatabase } = require('../config/database');

/**
 * Authentication middleware - verifies JWT token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required. Please provide a valid Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDatabase();
    const user = db.prepare('SELECT id, username, email, role, status FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return error(res, 'User not found', 401);
    }

    if (user.status === 'inactive') {
      return error(res, 'Account is inactive. Please contact an administrator.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token has expired', 401);
    }
    return error(res, 'Invalid token', 401);
  }
}

/**
 * Role-based access control middleware factory
 * @param  {...string} allowedRoles - Roles allowed to access the route
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(
        res,
        `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
        403
      );
    }

    next();
  };
}

module.exports = { authenticate, authorize };
