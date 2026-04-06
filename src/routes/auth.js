const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { validate, registerSchema, loginSchema } = require('../validators');
const { success, created, error } = require('../utils/response');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validate(registerSchema), (req, res) => {
  try {
    const result = AuthService.register(req.body);
    return created(res, result);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * POST /api/auth/login
 * Login and receive a JWT token
 */
router.post('/login', validate(loginSchema), (req, res) => {
  try {
    const result = AuthService.login(req.body);
    return success(res, result);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

module.exports = router;
