const Joi = require('joi');
const { ROLES, RECORD_TYPES, CATEGORIES } = require('../config/constants');

// --- User Validators ---

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(...Object.values(ROLES)),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email(),
}).min(1);

const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

// --- Financial Record Validators ---

const createRecordSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  type: Joi.string()
    .valid(...RECORD_TYPES)
    .required(),
  category: Joi.string()
    .valid(...CATEGORIES)
    .required(),
  date: Joi.date().iso().required(),
  description: Joi.string().max(500).allow('', null),
});

const updateRecordSchema = Joi.object({
  amount: Joi.number().positive().precision(2),
  type: Joi.string().valid(...RECORD_TYPES),
  category: Joi.string().valid(...CATEGORIES),
  date: Joi.date().iso(),
  description: Joi.string().max(500).allow('', null),
}).min(1);

const recordFilterSchema = Joi.object({
  type: Joi.string().valid(...RECORD_TYPES),
  category: Joi.string().valid(...CATEGORIES),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  min_amount: Joi.number().positive(),
  max_amount: Joi.number().positive().min(Joi.ref('min_amount')),
  search: Joi.string().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('date', 'amount', 'created_at', 'category').default('date'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

// --- Dashboard Validators ---

const dashboardFilterSchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  period: Joi.string().valid('weekly', 'monthly', 'yearly').default('monthly'),
});

/**
 * Express middleware factory for Joi validation
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details,
        },
      });
    }

    req[source] = value;
    next();
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateUserSchema,
  updateRoleSchema,
  updateStatusSchema,
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
  dashboardFilterSchema,
};
