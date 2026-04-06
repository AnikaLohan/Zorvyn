const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboardService');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, dashboardFilterSchema } = require('../validators');
const { success, error } = require('../utils/response');
const { ROLES } = require('../config/constants');

// All dashboard routes require authentication
// All roles can view dashboard data
router.use(authenticate);

/**
 * GET /api/dashboard/summary
 * Get overall financial summary
 */
router.get('/summary', validate(dashboardFilterSchema, 'query'), (req, res) => {
  try {
    const summary = DashboardService.getSummary(req.query);
    return success(res, summary);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/dashboard/categories
 * Get category-wise totals
 */
router.get('/categories', validate(dashboardFilterSchema, 'query'), (req, res) => {
  try {
    const categories = DashboardService.getCategoryTotals(req.query);
    return success(res, categories);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/dashboard/recent
 * Get recent activity
 */
router.get('/recent', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const records = DashboardService.getRecentActivity(limit);
    return success(res, records);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/dashboard/trends
 * Get income/expense trends over time
 */
router.get('/trends', validate(dashboardFilterSchema, 'query'), (req, res) => {
  try {
    const trends = DashboardService.getTrends(req.query);
    return success(res, trends);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/dashboard/top-categories
 * Get top spending categories (analyst and admin only)
 */
router.get('/top-categories', authorize(ROLES.ANALYST, ROLES.ADMIN), (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const categories = DashboardService.getTopCategories({
      ...req.query,
      limit,
    });
    return success(res, categories);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

module.exports = router;
