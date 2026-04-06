/**
 * Normalize a date value to YYYY-MM-DD string format.
 * Handles both Date objects (from Joi) and string inputs.
 */
function normalizeDate(date) {
  if (!date) return date;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date);
}

module.exports = { normalizeDate };
