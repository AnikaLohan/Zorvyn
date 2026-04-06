const { getDatabase } = require('../config/database');
const { normalizeDate } = require('../utils/dateHelper');

class DashboardService {
  /**
   * Get overall financial summary
   */
  static getSummary(filters = {}) {
    const db = getDatabase();
    const { start_date, end_date } = filters;

    let where = ['is_deleted = 0'];
    const params = [];

    if (start_date) {
      where.push('date >= ?');
      params.push(normalizeDate(start_date));
    }
    if (end_date) {
      where.push('date <= ?');
      params.push(normalizeDate(end_date));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const summary = db
      .prepare(
        `SELECT
          COUNT(*) as total_records,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance,
          COALESCE(AVG(CASE WHEN type = 'income' THEN amount END), 0) as avg_income,
          COALESCE(AVG(CASE WHEN type = 'expense' THEN amount END), 0) as avg_expense,
          COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
          COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
        FROM financial_records
        ${whereClause}`
      )
      .get(...params);

    return {
      total_records: summary.total_records,
      total_income: Math.round(summary.total_income * 100) / 100,
      total_expense: Math.round(summary.total_expense * 100) / 100,
      net_balance: Math.round(summary.net_balance * 100) / 100,
      avg_income: Math.round(summary.avg_income * 100) / 100,
      avg_expense: Math.round(summary.avg_expense * 100) / 100,
      income_count: summary.income_count,
      expense_count: summary.expense_count,
    };
  }

  /**
   * Get category-wise totals
   */
  static getCategoryTotals(filters = {}) {
    const db = getDatabase();
    const { start_date, end_date } = filters;

    let where = ['is_deleted = 0'];
    const params = [];

    if (start_date) {
      where.push('date >= ?');
      params.push(normalizeDate(start_date));
    }
    if (end_date) {
      where.push('date <= ?');
      params.push(normalizeDate(end_date));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const categories = db
      .prepare(
        `SELECT
          category,
          type,
          COUNT(*) as count,
          ROUND(SUM(amount), 2) as total,
          ROUND(AVG(amount), 2) as average
        FROM financial_records
        ${whereClause}
        GROUP BY category, type
        ORDER BY total DESC`
      )
      .all(...params);

    return categories;
  }

  /**
   * Get recent activity (last N records)
   */
  static getRecentActivity(limit = 10) {
    const db = getDatabase();

    const records = db
      .prepare(
        `SELECT r.*, u.username as created_by
         FROM financial_records r
         JOIN users u ON r.user_id = u.id
         WHERE r.is_deleted = 0
         ORDER BY r.created_at DESC
         LIMIT ?`
      )
      .all(limit);

    return records;
  }

  /**
   * Get trends data (monthly or weekly)
   */
  static getTrends(filters = {}) {
    const db = getDatabase();
    const { period = 'monthly', start_date, end_date } = filters;

    let where = ['is_deleted = 0'];
    const params = [];

    if (start_date) {
      where.push('date >= ?');
      params.push(normalizeDate(start_date));
    }
    if (end_date) {
      where.push('date <= ?');
      params.push(normalizeDate(end_date));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    let groupExpr;
    let labelExpr;

    switch (period) {
      case 'weekly':
        groupExpr = "strftime('%Y-%W', date)";
        labelExpr = "strftime('%Y-W%W', date)";
        break;
      case 'yearly':
        groupExpr = "strftime('%Y', date)";
        labelExpr = "strftime('%Y', date)";
        break;
      case 'monthly':
      default:
        groupExpr = "strftime('%Y-%m', date)";
        labelExpr = "strftime('%Y-%m', date)";
        break;
    }

    const trends = db
      .prepare(
        `SELECT
          ${labelExpr} as period,
          ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 2) as income,
          ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) as expense,
          ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 2) as net,
          COUNT(*) as transaction_count
        FROM financial_records
        ${whereClause}
        GROUP BY ${groupExpr}
        ORDER BY ${groupExpr} ASC`
      )
      .all(...params);

    return trends;
  }

  /**
   * Get top spending categories
   */
  static getTopCategories(filters = {}) {
    const db = getDatabase();
    const { start_date, end_date, limit = 5 } = filters;

    let where = ['is_deleted = 0', "type = 'expense'"];
    const params = [];

    if (start_date) {
      where.push('date >= ?');
      params.push(normalizeDate(start_date));
    }
    if (end_date) {
      where.push('date <= ?');
      params.push(normalizeDate(end_date));
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const categories = db
      .prepare(
        `SELECT
          category,
          COUNT(*) as count,
          ROUND(SUM(amount), 2) as total,
          ROUND(AVG(amount), 2) as average
        FROM financial_records
        ${whereClause}
        GROUP BY category
        ORDER BY total DESC
        LIMIT ?`
      )
      .all(...params, limit);

    return categories;
  }
}

module.exports = DashboardService;
