const { error } = require('../utils/response');

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return error(res, 'Invalid JSON in request body', 400);
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return error(res, 'A record with that value already exists', 409);
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return error(res, 'Database constraint violation', 400);
  }

  return error(res, 'Internal server error', 500);
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
  return error(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}

module.exports = { errorHandler, notFoundHandler };
