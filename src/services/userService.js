const { getDatabase } = require('../config/database');

class UserService {
  /**
   * Get all users (excludes password hashes)
   */
  static getAll({ page = 1, limit = 20 }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const users = db
      .prepare(
        `SELECT id, username, email, role, status, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset);

    const { total } = db.prepare('SELECT COUNT(*) as total FROM users').get();

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a user by ID
   */
  static getById(id) {
    const db = getDatabase();
    const user = db
      .prepare(
        `SELECT id, username, email, role, status, created_at, updated_at
         FROM users WHERE id = ?`
      )
      .get(id);

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return user;
  }

  /**
   * Update user profile
   */
  static update(id, { username, email }) {
    const db = getDatabase();

    const user = this.getById(id);

    // Check for unique constraints
    if (username && username !== user.username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (existing) {
        const err = new Error('Username already taken');
        err.statusCode = 409;
        throw err;
      }
    }

    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existing) {
        const err = new Error('Email already taken');
        err.statusCode = 409;
        throw err;
      }
    }

    const updatedUsername = username || user.username;
    const updatedEmail = email || user.email;

    db.prepare(
      `UPDATE users SET username = ?, email = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(updatedUsername, updatedEmail, id);

    return this.getById(id);
  }

  /**
   * Update user role (admin only)
   */
  static updateRole(id, role) {
    const db = getDatabase();
    this.getById(id); // ensures user exists

    db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(role, id);

    return this.getById(id);
  }

  /**
   * Update user status (admin only)
   */
  static updateStatus(id, status) {
    const db = getDatabase();
    this.getById(id); // ensures user exists

    db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);

    return this.getById(id);
  }

  /**
   * Delete a user (admin only)
   */
  static delete(id) {
    const db = getDatabase();
    this.getById(id); // ensures user exists

    // Soft-delete related financial records
    db.prepare(`UPDATE financial_records SET is_deleted = 1, updated_at = datetime('now') WHERE user_id = ?`).run(id);

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return { message: 'User deleted successfully' };
  }
}

module.exports = UserService;
