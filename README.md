# Finance Data Processing and Access Control Backend

A RESTful backend API for a finance dashboard system, built with **Node.js**, **Express**, and **SQLite**. It supports user management with role-based access control, financial records CRUD with filtering/pagination, and dashboard analytics APIs.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Role-Based Access Control](#role-based-access-control)
- [Data Model](#data-model)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Optional Enhancements Implemented](#optional-enhancements-implemented)

---

## Tech Stack

| Component         | Technology                     |
|-------------------|--------------------------------|
| Runtime           | Node.js                        |
| Framework         | Express 5                      |
| Database          | SQLite (via better-sqlite3)    |
| Authentication    | JWT (jsonwebtoken + bcryptjs)  |
| Validation        | Joi                            |
| Security          | Helmet, CORS, express-rate-limit |
| Testing           | Jest + Supertest               |

## Project Structure

```
├── src/
│   ├── config/
│   │   ├── constants.js      # App-wide constants (JWT config, roles, categories)
│   │   └── database.js       # SQLite database setup and schema initialization
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication & role-based authorization
│   │   └── errorHandler.js   # Global error handling & 404 handler
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/register, POST /api/auth/login
│   │   ├── users.js          # User management endpoints
│   │   ├── records.js        # Financial records CRUD endpoints
│   │   └── dashboard.js      # Dashboard analytics endpoints
│   ├── services/
│   │   ├── authService.js    # Registration and login business logic
│   │   ├── userService.js    # User CRUD business logic
│   │   ├── recordService.js  # Financial record business logic
│   │   └── dashboardService.js # Analytics and summary logic
│   ├── validators/
│   │   └── index.js          # Joi validation schemas and middleware
│   ├── utils/
│   │   ├── response.js       # Standardized API response helpers
│   │   └── dateHelper.js     # Date normalization utilities
│   ├── app.js                # Express app setup (middleware, routes)
│   └── index.js              # Entry point (starts the server)
├── tests/
│   └── api.test.js           # Integration tests (50 tests)
├── package.json
└── README.md
```

## Setup & Installation

### Prerequisites

- **Node.js** v18 or later
- **npm** v8 or later

### Install Dependencies

```bash
npm install
```

That's it! No external database setup is required — SQLite creates the database file automatically.

## Running the Application

```bash
# Production mode
npm start

# Development mode (auto-restart on file changes)
npm run dev
```

The server starts on `http://localhost:3000` by default.

### Environment Variables (Optional)

| Variable       | Default                    | Description                  |
|----------------|----------------------------|------------------------------|
| `PORT`         | `3000`                     | Server port                  |
| `JWT_SECRET`   | (built-in dev secret)      | Secret key for JWT signing   |
| `JWT_EXPIRES_IN` | `24h`                    | JWT token expiration time    |
| `DB_PATH`      | `./data/finance.db`        | SQLite database file path    |

## Running Tests

```bash
npm test
```

The test suite uses an **in-memory SQLite database**, so no setup is needed. All 50 tests cover:

- Health check endpoint
- User registration and login
- Input validation and error handling
- Role-based access control (admin, analyst, viewer)
- Financial records CRUD operations
- Filtering, search, and pagination
- Dashboard summary and analytics
- Edge cases (duplicate users, invalid tokens, self-deletion prevention)

---

## API Documentation

All API responses follow a consistent format:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "message": "...", "details": [...] } }
{ "success": true, "records": [...], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
```

### Authentication

#### Register a new user

```
POST /api/auth/register
```

**Body:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "secret123",
  "role": "viewer"
}
```

The `role` field is optional and defaults to `"viewer"`. Valid values: `"viewer"`, `"analyst"`, `"admin"`.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "username": "john", "email": "john@example.com", "role": "viewer", "status": "active" },
    "token": "eyJhbGciOi..."
  }
}
```

#### Login

```
POST /api/auth/login
```

**Body:**
```json
{ "email": "john@example.com", "password": "secret123" }
```

### Users

> All user endpoints require `Authorization: Bearer <token>` header.

| Method  | Endpoint                  | Role Required      | Description                |
|---------|---------------------------|--------------------|----------------------------|
| GET     | `/api/users`              | Admin, Analyst     | List all users (paginated) |
| GET     | `/api/users/me`           | Any authenticated  | Get current user profile   |
| GET     | `/api/users/:id`          | Admin              | Get specific user          |
| PUT     | `/api/users/:id`          | Admin or Self      | Update user profile        |
| PATCH   | `/api/users/:id/role`     | Admin              | Change user role           |
| PATCH   | `/api/users/:id/status`   | Admin              | Activate/deactivate user   |
| DELETE  | `/api/users/:id`          | Admin              | Delete user                |

### Financial Records

> Creating, updating, and deleting are **admin-only**. All roles can read.

| Method  | Endpoint              | Role Required  | Description                         |
|---------|-----------------------|----------------|-------------------------------------|
| GET     | `/api/records`        | Any            | List records (filtered, paginated)  |
| GET     | `/api/records/:id`    | Any            | Get a specific record               |
| POST    | `/api/records`        | Admin          | Create a record                     |
| PUT     | `/api/records/:id`    | Admin          | Update a record                     |
| DELETE  | `/api/records/:id`    | Admin          | Soft-delete a record                |

#### Create a Record

```json
{
  "amount": 5000.00,
  "type": "income",
  "category": "salary",
  "date": "2024-01-15",
  "description": "Monthly salary"
}
```

**Available categories:** `salary`, `freelance`, `investment`, `food`, `transport`, `utilities`, `entertainment`, `healthcare`, `education`, `shopping`, `rent`, `insurance`, `savings`, `other`

#### List Records with Filters

```
GET /api/records?type=expense&category=food&start_date=2024-01-01&end_date=2024-12-31&search=groceries&page=1&limit=20&sort_by=date&sort_order=desc
```

| Parameter    | Type    | Description                                        |
|--------------|---------|----------------------------------------------------|
| `type`       | string  | Filter by `income` or `expense`                    |
| `category`   | string  | Filter by category                                 |
| `start_date` | string  | ISO date (YYYY-MM-DD), inclusive lower bound        |
| `end_date`   | string  | ISO date (YYYY-MM-DD), inclusive upper bound        |
| `min_amount` | number  | Minimum amount filter                              |
| `max_amount` | number  | Maximum amount filter                              |
| `search`     | string  | Search in description and category                 |
| `page`       | number  | Page number (default: 1)                           |
| `limit`      | number  | Records per page (default: 20, max: 100)           |
| `sort_by`    | string  | `date`, `amount`, `created_at`, or `category`      |
| `sort_order` | string  | `asc` or `desc` (default: `desc`)                  |

### Dashboard

| Method | Endpoint                        | Role Required     | Description                        |
|--------|---------------------------------|-------------------|------------------------------------|
| GET    | `/api/dashboard/summary`        | Any               | Overall income/expense/net balance |
| GET    | `/api/dashboard/categories`     | Any               | Category-wise breakdown            |
| GET    | `/api/dashboard/recent`         | Any               | Recent activity                    |
| GET    | `/api/dashboard/trends`         | Any               | Time-based trends (weekly/monthly/yearly) |
| GET    | `/api/dashboard/top-categories` | Analyst, Admin    | Top spending categories            |

#### Summary Response Example

```json
{
  "success": true,
  "data": {
    "total_records": 8, "total_income": 9000.00, "total_expense": 1000.00,
    "net_balance": 8000.00, "avg_income": 4500.00, "avg_expense": 250.00,
    "income_count": 2, "expense_count": 4
  }
}
```

#### Trends Response Example

```json
{
  "success": true,
  "data": [
    { "period": "2024-01", "income": 5000, "expense": 400, "net": 4600, "transaction_count": 4 },
    { "period": "2024-02", "income": 3000, "expense": 600, "net": 2400, "transaction_count": 3 }
  ]
}
```

---

## Role-Based Access Control

| Action                        | Viewer | Analyst | Admin |
|-------------------------------|--------|---------|-------|
| View own profile              | ✅     | ✅      | ✅    |
| View records                  | ✅     | ✅      | ✅    |
| View dashboard summary        | ✅     | ✅      | ✅    |
| View trends & recent activity | ✅     | ✅      | ✅    |
| List users                    | ❌     | ✅      | ✅    |
| View top categories (insight) | ❌     | ✅      | ✅    |
| Create/update/delete records  | ❌     | ❌      | ✅    |
| Manage users (role, status)   | ❌     | ❌      | ✅    |
| Delete users                  | ❌     | ❌      | ✅    |

Access control is enforced at the **middleware level** using `authenticate` (JWT verification) and `authorize(...roles)` (role checking).

## Data Model

### Users Table

| Column        | Type    | Constraints                                  |
|---------------|---------|----------------------------------------------|
| id            | TEXT    | PRIMARY KEY (UUID)                           |
| username      | TEXT    | UNIQUE, NOT NULL                             |
| email         | TEXT    | UNIQUE, NOT NULL                             |
| password_hash | TEXT    | NOT NULL (bcrypt hashed)                     |
| role          | TEXT    | NOT NULL, CHECK (viewer/analyst/admin)       |
| status        | TEXT    | NOT NULL, CHECK (active/inactive)            |
| created_at    | TEXT    | DEFAULT datetime('now')                      |
| updated_at    | TEXT    | DEFAULT datetime('now')                      |

### Financial Records Table

| Column      | Type    | Constraints                                    |
|-------------|---------|------------------------------------------------|
| id          | TEXT    | PRIMARY KEY (UUID)                             |
| user_id     | TEXT    | NOT NULL, FOREIGN KEY → users(id)              |
| amount      | REAL    | NOT NULL                                       |
| type        | TEXT    | NOT NULL, CHECK (income/expense)               |
| category    | TEXT    | NOT NULL                                       |
| date        | TEXT    | NOT NULL (YYYY-MM-DD)                          |
| description | TEXT    | Nullable                                       |
| is_deleted  | INTEGER | NOT NULL, DEFAULT 0 (soft delete flag)         |
| created_at  | TEXT    | DEFAULT datetime('now')                        |
| updated_at  | TEXT    | DEFAULT datetime('now')                        |

Indexes on `user_id`, `type`, `category`, `date`, and `is_deleted` for query performance.

## Design Decisions & Assumptions

1. **SQLite** was chosen for simplicity and zero-configuration setup. For production, this can be swapped for PostgreSQL or MySQL with minimal service changes.
2. **Soft delete** is implemented for financial records (`is_deleted` flag) to preserve audit trail integrity.
3. **Registration allows role assignment** for demo purposes. In production, new users would default to "viewer" and an admin would promote them.
4. **Predefined categories** are enforced via validation to prevent data inconsistency and enable reliable aggregation.
5. **Password hashing** uses bcryptjs with 10 salt rounds.
6. **Dates** are stored as ISO strings (YYYY-MM-DD) in SQLite.
7. **Synchronous SQLite** (better-sqlite3) is used intentionally — it's faster than async alternatives and SQLite is single-writer so async doesn't add concurrency benefits.
8. **All financial records are visible to all authenticated users** (read access). In a multi-tenant system, you would add user/organization scoping.

## Optional Enhancements Implemented

- ✅ **Token-based authentication** (JWT with configurable expiration)
- ✅ **Pagination** on records and user listing
- ✅ **Search support** (text search in description and category)
- ✅ **Soft delete** for financial records
- ✅ **Rate limiting** (100 requests per 15 minutes per IP)
- ✅ **Integration tests** (50 tests covering all endpoints and edge cases)
- ✅ **API documentation** (this README)
- ✅ **Security headers** (via Helmet middleware)
- ✅ **Input validation** with detailed error messages
- ✅ **Health check endpoint** (`GET /api/health`)

## Quick Start Example

```bash
# 1. Install and start
npm install && npm start

# 2. Register an admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123","role":"admin"}'

# 3. Copy the token from the response, then create a record
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":5000,"type":"income","category":"salary","date":"2024-01-15","description":"January salary"}'

# 4. View dashboard summary
curl http://localhost:3000/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```
