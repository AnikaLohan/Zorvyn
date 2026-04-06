const express = require('express');
const router = express.Router();
const RecordService = require('../services/recordService');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validate,
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
} = require('../validators');
const { success, created, error } = require('../utils/response');
const { ROLES } = require('../config/constants');

// All record routes require authentication
router.use(authenticate);

/**
 * GET /api/records
 * List financial records with filtering and pagination (all roles)
 */
router.get('/', validate(recordFilterSchema, 'query'), (req, res) => {
  try {
    const result = RecordService.list(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * GET /api/records/:id
 * Get a specific financial record (all roles)
 */
router.get('/:id', (req, res) => {
  try {
    const record = RecordService.getById(req.params.id);
    return success(res, record);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * POST /api/records
 * Create a financial record (admin only)
 */
router.post('/', authorize(ROLES.ADMIN), validate(createRecordSchema), (req, res) => {
  try {
    const record = RecordService.create(req.user.id, req.body);
    return created(res, record);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * PUT /api/records/:id
 * Update a financial record (admin only)
 */
router.put('/:id', authorize(ROLES.ADMIN), validate(updateRecordSchema), (req, res) => {
  try {
    const record = RecordService.update(req.params.id, req.body);
    return success(res, record);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

/**
 * DELETE /api/records/:id
 * Soft delete a financial record (admin only)
 */
router.delete('/:id', authorize(ROLES.ADMIN), (req, res) => {
  try {
    const result = RecordService.delete(req.params.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
});

module.exports = router;
