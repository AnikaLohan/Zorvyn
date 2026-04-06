const request = require('supertest');
const createApp = require('../src/app');
const { getDatabase, closeDatabase } = require('../src/config/database');

let app;
let adminToken;
let analystToken;
let viewerToken;
let adminId;
let analystId;
let viewerId;
let recordId;

beforeAll(() => {
  // Use in-memory database for tests
  process.env.DB_PATH = ':memory:';
  // Reset cached db connection
  closeDatabase();
  app = createApp();
  // Initialize database
  getDatabase();
});

afterAll(() => {
  closeDatabase();
});

describe('Health Check', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('Authentication', () => {
  test('POST /api/auth/register - creates admin user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'admin',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.token).toBeDefined();
    adminToken = res.body.data.token;
    adminId = res.body.data.user.id;
  });

  test('POST /api/auth/register - creates analyst user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'analyst',
      email: 'analyst@test.com',
      password: 'analyst123',
      role: 'analyst',
    });
    expect(res.status).toBe(201);
    analystToken = res.body.data.token;
    analystId = res.body.data.user.id;
  });

  test('POST /api/auth/register - creates viewer user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'viewer',
      email: 'viewer@test.com',
      password: 'viewer123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('viewer');
    viewerToken = res.body.data.token;
    viewerId = res.body.data.user.id;
  });

  test('POST /api/auth/register - rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'another',
      email: 'admin@test.com',
      password: 'pass123',
    });
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register - validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'ab', // too short
      email: 'not-an-email',
      password: '123', // too short
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test('POST /api/auth/login - successful login', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'admin123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@test.com');
  });

  test('POST /api/auth/login - wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login - non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'test123',
    });
    expect(res.status).toBe(401);
  });
});

describe('User Management', () => {
  test('GET /api/users - admin can list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(3);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/users - analyst can list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/users - viewer cannot list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/users - unauthenticated cannot list users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('GET /api/users/me - returns current user', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('viewer');
  });

  test('PUT /api/users/:id - user can update own profile', async () => {
    const res = await request(app)
      .put(`/api/users/${viewerId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ username: 'viewerupdated' });
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('viewerupdated');
  });

  test('PUT /api/users/:id - user cannot update other profile', async () => {
    const res = await request(app)
      .put(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ username: 'hackedadmin' });
    expect(res.status).toBe(403);
  });

  test('PATCH /api/users/:id/role - admin can change role', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'analyst' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('analyst');

    // Revert back to viewer
    await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'viewer' });
  });

  test('PATCH /api/users/:id/role - non-admin cannot change role', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  test('PATCH /api/users/:id/status - admin can deactivate user', async () => {
    // Create a temp user to deactivate
    const regRes = await request(app).post('/api/auth/register').send({
      username: 'tempuser',
      email: 'temp@test.com',
      password: 'temp123',
    });
    const tempId = regRes.body.data.user.id;

    const res = await request(app)
      .patch(`/api/users/${tempId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');

    // Verify inactive user cannot login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'temp@test.com',
      password: 'temp123',
    });
    expect(loginRes.status).toBe(403);
  });

  test('PATCH /api/users/:id/role - validates invalid role', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superadmin' });
    expect(res.status).toBe(400);
  });
});

describe('Financial Records', () => {
  test('POST /api/records - admin can create record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        type: 'income',
        category: 'salary',
        date: '2024-01-15',
        description: 'Monthly salary',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(5000);
    expect(res.body.data.type).toBe('income');
    recordId = res.body.data.id;
  });

  test('POST /api/records - creates multiple records for testing', async () => {
    const records = [
      { amount: 150, type: 'expense', category: 'food', date: '2024-01-16', description: 'Groceries' },
      { amount: 50, type: 'expense', category: 'transport', date: '2024-01-17', description: 'Bus fare' },
      { amount: 200, type: 'expense', category: 'utilities', date: '2024-01-18', description: 'Electric bill' },
      { amount: 3000, type: 'income', category: 'freelance', date: '2024-02-01', description: 'Freelance project' },
      { amount: 100, type: 'expense', category: 'entertainment', date: '2024-02-05', description: 'Movie night' },
      { amount: 500, type: 'expense', category: 'shopping', date: '2024-02-10', description: 'New clothes' },
      { amount: 1000, type: 'income', category: 'investment', date: '2024-03-01', description: 'Dividend' },
    ];

    for (const record of records) {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(record);
      expect(res.status).toBe(201);
    }
  });

  test('POST /api/records - viewer cannot create record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        amount: 100,
        type: 'expense',
        category: 'food',
        date: '2024-01-20',
      });
    expect(res.status).toBe(403);
  });

  test('POST /api/records - analyst cannot create record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount: 100,
        type: 'expense',
        category: 'food',
        date: '2024-01-20',
      });
    expect(res.status).toBe(403);
  });

  test('POST /api/records - validates required fields', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: -100, // negative
        type: 'invalid',
        category: 'nonexistent',
      });
    expect(res.status).toBe(400);
  });

  test('GET /api/records - all roles can view records', async () => {
    for (const token of [adminToken, analystToken, viewerToken]) {
      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.records).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    }
  });

  test('GET /api/records - filter by type', async () => {
    const res = await request(app)
      .get('/api/records?type=income')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.records.forEach((r) => expect(r.type).toBe('income'));
  });

  test('GET /api/records - filter by category', async () => {
    const res = await request(app)
      .get('/api/records?category=food')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.records.forEach((r) => expect(r.category).toBe('food'));
  });

  test('GET /api/records - filter by date range', async () => {
    const res = await request(app)
      .get('/api/records?start_date=2024-02-01&end_date=2024-02-28')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.records.length).toBeGreaterThan(0);
  });

  test('GET /api/records - search by description', async () => {
    const res = await request(app)
      .get('/api/records?search=salary')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.records.length).toBeGreaterThan(0);
  });

  test('GET /api/records - pagination', async () => {
    const res = await request(app)
      .get('/api/records?page=1&limit=3')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.records.length).toBeLessThanOrEqual(3);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(3);
  });

  test('GET /api/records/:id - get specific record', async () => {
    const res = await request(app)
      .get(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(recordId);
  });

  test('GET /api/records/:id - 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/records/non-existent-id')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(404);
  });

  test('PUT /api/records/:id - admin can update record', async () => {
    const res = await request(app)
      .put(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 5500, description: 'Updated salary' });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(5500);
    expect(res.body.data.description).toBe('Updated salary');
  });

  test('PUT /api/records/:id - viewer cannot update record', async () => {
    const res = await request(app)
      .put(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 9999 });
    expect(res.status).toBe(403);
  });

  test('DELETE /api/records/:id - viewer cannot delete record', async () => {
    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  test('DELETE /api/records/:id - admin can delete record (soft delete)', async () => {
    // Create a record to delete
    const createRes = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 999,
        type: 'expense',
        category: 'other',
        date: '2024-01-20',
        description: 'To be deleted',
      });
    const deleteId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/records/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    // Verify it's no longer accessible
    const getRes = await request(app)
      .get(`/api/records/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);
  });
});

describe('Dashboard', () => {
  test('GET /api/dashboard/summary - returns financial summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total_income).toBeDefined();
    expect(res.body.data.total_expense).toBeDefined();
    expect(res.body.data.net_balance).toBeDefined();
    expect(res.body.data.total_records).toBeGreaterThan(0);
  });

  test('GET /api/dashboard/summary - with date filter', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary?start_date=2024-01-01&end_date=2024-01-31')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/dashboard/categories - returns category totals', async () => {
    const res = await request(app)
      .get('/api/dashboard/categories')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('total');
  });

  test('GET /api/dashboard/recent - returns recent activity', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=5')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/dashboard/trends - returns monthly trends', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends?period=monthly')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('period');
      expect(res.body.data[0]).toHaveProperty('income');
      expect(res.body.data[0]).toHaveProperty('expense');
      expect(res.body.data[0]).toHaveProperty('net');
    }
  });

  test('GET /api/dashboard/top-categories - analyst can access', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-categories')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/dashboard/top-categories - viewer cannot access', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-categories')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/dashboard/* - unauthenticated cannot access', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

describe('Error Handling', () => {
  test('Returns 404 for undefined routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('Returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  test('Returns 401 for missing auth header', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });
});

describe('User Deletion', () => {
  test('DELETE /api/users/:id - admin cannot delete self', async () => {
    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  test('DELETE /api/users/:id - viewer cannot delete users', async () => {
    const res = await request(app)
      .delete(`/api/users/${analystId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
