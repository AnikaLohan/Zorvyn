const crypto = require('crypto');
const { getDatabase } = require('../config/database');
const { normalizeDate } = require('../utils/dateHelper');

class RecordService {
  /**
   * Create a financial record
   */
  static create(userId, { amount, type, category, date, description }) {
    const db = getDatabase();
    const id = crypto.randomUUID();

    // Joi converts dates to Date objects; normalize to YYYY-MM-DD string
    const dateStr = normalizeDate(date);

    db.prepare(
      `INSERT INTO financial_records (id, user_id, amount, type, category, date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, amount, type, category, dateStr, description || null);

    return this.getById(id);
  }

  /**
   * Get a financial record by ID (non-deleted)
   */
  static getById(id) {
    const db = getDatabase();
    const record = db
      .prepare(
        `SELECT r.*, u.username as created_by
         FROM financial_records r
         JOIN users u ON r.user_id = u.id
         WHERE r.id = ? AND r.is_deleted = 0`
      )
      .get(id);

    if (!record) {
      const err = new Error('Financial record not found');
      err.statusCode = 404;
      throw err;
    }

    return record;
  }

  /**
   * List financial records with filtering, search, and pagination
   */
  static list(filters = {}) {
    const db = getDatabase();
    const {
      type,
      category,
      start_date,
      end_date,
      min_amount,
      max_amount,
      search,
      page = 1,
      limit = 20,
      sort_by = 'date',
      sort_order = 'desc',
    } = filters;

    let where = ['r.is_deleted = 0'];
    const params = [];

    if (type) {
      where.push('r.type = ?');
      params.push(type);
    }

    if (category) {
      where.push('r.category = ?');
      params.push(category);
    }

    if (start_date) {
      where.push('r.date >= ?');
      params.push(normalizeDate(start_date));
    }

    if (end_date) {
      where.push('r.date <= ?');
      params.push(normalizeDate(end_date));
    }

    if (min_amount) {
      where.push('r.amount >= ?');
      params.push(min_amount);
    }

    if (max_amount) {
      where.push('r.amount <= ?');
      params.push(max_amount);
    }

    if (search) {
      where.push('(r.description LIKE ? OR r.category LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Validate sort column to prevent SQL injection
    const validSortColumns = {
      date: 'r.date',
      amount: 'r.amount',
      created_at: 'r.created_at',
      category: 'r.category',
    };
    const sortColumn = validSortColumns[sort_by] || 'r.date';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const records = db
      .prepare(
        `SELECT r.*, u.username as created_by
         FROM financial_records r
         JOIN users u ON r.user_id = u.id
         ${whereClause}
         ORDER BY ${sortColumn} ${order}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limitNum, offset);

    const countResult = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM financial_records r
         ${whereClause}`
      )
      .get(...params);

    return {
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limitNum),
      },
    };
  }

  /**
   * Update a financial record
   */
  static update(id, updates) {
    const db = getDatabase();
    const record = this.getById(id);

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (['amount', 'type', 'category', 'date', 'description'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        // Normalize date objects to YYYY-MM-DD strings
        if (key === 'date') {
          params.push(normalizeDate(value));
        } else {
          params.push(value);
        }
      }
    }

    if (fields.length === 0) {
      return record;
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(
      `UPDATE financial_records SET ${fields.join(', ')} WHERE id = ?`
    ).run(...params);

    return this.getById(id);
  }

  /**
   * Soft delete a financial record
   */
  static delete(id) {
    const db = getDatabase();
    this.getById(id); // ensures record exists

    db.prepare(
      `UPDATE financial_records SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`
    ).run(id);

    return { message: 'Record deleted successfully' };
  }
}

module.exports = RecordService;
