const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, updateUserSchema, updateRoleSchema, updateStatusSchema } = require('../validators');
const { success, error } = require('../utils/response');
const { ROLES } = require('../config/constants');

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * List all users (admin and analyst)
 */
router.get('/', authorize(ROLES.ADMIN, ROLES.ANALYST), (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = UserService.getAll({ page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/me', (req, res) => {
  try {
    const user = UserService.getById(req.user.id);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/users/:id
 * Get a specific user (admin only)
 */
router.get('/:id', authorize(ROLES.ADMIN), (req, res) => {
  try {
    const user = UserService.getById(req.params.id);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * PUT /api/users/:id
 * Update user profile (admin, or self)
 */
router.put('/:id', validate(updateUserSchema), (req, res) => {
  try {
    // Users can only update their own profile unless they are admin
    if (req.user.role !== ROLES.ADMIN && req.user.id !== req.params.id) {
      return error(res, 'You can only update your own profile', 403);
    }
    const user = UserService.update(req.params.id, req.body);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * PATCH /api/users/:id/role
 * Update user role (admin only)
 */
router.patch('/:id/role', authorize(ROLES.ADMIN), validate(updateRoleSchema), (req, res) => {
  try {
    const user = UserService.updateRole(req.params.id, req.body.role);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * PATCH /api/users/:id/status
 * Update user status (admin only)
 */
router.patch('/:id/status', authorize(ROLES.ADMIN), validate(updateStatusSchema), (req, res) => {
  try {
    const user = UserService.updateStatus(req.params.id, req.body.status);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', authorize(ROLES.ADMIN), (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return error(res, 'You cannot delete your own account', 400);
    }
    const result = UserService.delete(req.params.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

module.exports = router;
