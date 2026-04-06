const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

class AuthService {
  /**
   * Register a new user
   */
  static register({ username, email, password, role = 'viewer' }) {
    const db = getDatabase();

    // Check if user already exists
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .get(email, username);

    if (existing) {
      const err = new Error('User with this email or username already exists');
      err.statusCode = 409;
      throw err;
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, 'active')`
    ).run(id, username, email, passwordHash, role);

    const user = db
      .prepare('SELECT id, username, email, role, status, created_at FROM users WHERE id = ?')
      .get(id);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return { user, token };
  }

  /**
   * Login a user
   */
  static login({ email, password }) {
    const db = getDatabase();

    const user = db
      .prepare('SELECT id, username, email, password_hash, role, status FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (user.status === 'inactive') {
      const err = new Error('Account is inactive. Please contact an administrator.');
      err.statusCode = 403;
      throw err;
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
}

module.exports = AuthService;
