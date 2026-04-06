/**
 * Standardized API response helpers
 */

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function created(res, data) {
  return success(res, data, 201);
}

function paginated(res, data, pagination) {
  return res.status(200).json({
    success: true,
    data,
    pagination,
  });
}

function error(res, message, statusCode = 500, details = null) {
  const response = {
    success: false,
    error: {
      message,
      ...(details && { details }),
    },
  };
  return res.status(statusCode).json(response);
}

module.exports = { success, created, paginated, error };
