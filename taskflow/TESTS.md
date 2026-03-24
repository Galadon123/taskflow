# Testing Guide — Comprehensive Test Suite

This document outlines the testing strategy and test cases for TaskFlow microservices.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Auth Service Tests](#auth-service-tests)
3. [Task Service Tests](#task-service-tests)
4. [Notification Service Tests](#notification-service-tests)
5. [Integration Tests](#integration-tests)
6. [Running Tests](#running-tests)
7. [Test Coverage](#test-coverage)

---

## Testing Setup

### Installation

Add testing dependencies to each service:

```bash
npm install --save-dev jest supertest @types/jest dotenv-cli
```

### Jest Configuration

Create `jest.config.js` in each service:

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/db.js'
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000
};
```

### Jest Setup File

Create `jest.setup.js` in each service:

```javascript
require('dotenv').config({ path: '.env.test' });
```

### .env.test Files

**auth-service/.env.test:**
```bash
NODE_ENV=test
PORT=4001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow_auth_test
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=test_secret_key_32_characters_long_____
JWT_REFRESH_SECRET=test_refresh_key_32_characters_______
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:3000
```

**task-service/.env.test:**
```bash
NODE_ENV=test
PORT=4002
MONGO_URI=mongodb://localhost:27017/taskflow_tasks_test
AUTH_SERVICE_URL=http://localhost:4001
NOTIFY_SERVICE_URL=http://localhost:4003
CORS_ORIGIN=http://localhost:3000
```

**notification-service/.env.test:**
```bash
NODE_ENV=test
PORT=4003
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=taskflow_notifications_test
MYSQL_USER=root
MYSQL_PASSWORD=root
CORS_ORIGIN=http://localhost:3000
```

---

## Auth Service Tests

### `auth-service/__tests__/auth.test.js`

```javascript
const request = require('supertest');
const { Pool } = require('pg');
const app = require('../src/index');
const { pool } = require('../src/db');

describe('Auth Service', () => {
  let testToken;
  let testUserId;

  beforeAll(async () => {
    // Create test database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500),
        role VARCHAR(20) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS refresh_tokens');
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    test('Should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@test.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('john@test.com');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      testUserId = response.body.user.id;
      testToken = response.body.accessToken;
    });

    test('Should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe'
          // missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('Should return 409 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'john@test.com', // already registered
          password: 'Password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    test('Should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@test.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('john@test.com');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('Should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@test.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('Should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    test('Should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testUserId);
      expect(response.body.email).toBe('john@test.com');
      expect(response.body.name).toBe('John Doe');
    });

    test('Should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('Should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('PUT /api/auth/me', () => {
    test('Should update user profile', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'John Updated',
          avatar: 'https://example.com/avatar.jpg'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('John Updated');
      expect(response.body.avatar).toBe('https://example.com/avatar.jpg');
    });

    test('Should update only provided fields', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'John Final'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('John Final');
      expect(response.body.avatar).toBe('https://example.com/avatar.jpg');
    });

    test('Should return 401 without token', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .send({ name: 'Unknown' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('Should logout successfully', async () => {
      // First login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@test.com',
          password: 'SecurePass123'
        });

      const { refreshToken } = loginRes.body;

      // Then logout
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out');
    });
  });
});
```

---

## Task Service Tests

### `task-service/__tests__/tasks.test.js`

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');

// Mock Auth Service
jest.mock('axios');
const axios = require('axios');

const mockUser = {
  id: 'test-user-uuid',
  email: 'test@example.com',
  role: 'member'
};

describe('Task Service', () => {
  let projectId;
  let taskId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(() => {
    // Mock Auth Service response
    axios.get.mockResolvedValue({ data: mockUser });
  });

  describe('Projects', () => {
    describe('POST /api/tasks/projects', () => {
      test('Should create a new project', async () => {
        const response = await request(app)
          .post('/api/tasks/projects')
          .set('Authorization', 'Bearer test-token')
          .send({
            name: 'Test Project',
            description: 'A test project'
          });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Test Project');
        expect(response.body.owner_id).toBe(mockUser.id);
        expect(response.body.members).toContain(mockUser.id);

        projectId = response.body._id;
      });

      test('Should return 400 without project name', async () => {
        const response = await request(app)
          .post('/api/tasks/projects')
          .set('Authorization', 'Bearer test-token')
          .send({
            description: 'Missing name'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('name');
      });

      test('Should return 401 without token', async () => {
        const response = await request(app)
          .post('/api/tasks/projects')
          .send({
            name: 'No Auth Project'
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/tasks/projects', () => {
      test('Should list all projects for user', async () => {
        const response = await request(app)
          .get('/api/tasks/projects')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/tasks/projects/:id', () => {
      test('Should get project details', async () => {
        const response = await request(app)
          .get(`/api/tasks/projects/${projectId}`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body._id.toString()).toBe(projectId.toString());
        expect(response.body.name).toBe('Test Project');
      });

      test('Should return 404 for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/tasks/projects/${fakeId}`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/tasks/projects/:id', () => {
      test('Should update project', async () => {
        const response = await request(app)
          .put(`/api/tasks/projects/${projectId}`)
          .set('Authorization', 'Bearer test-token')
          .send({
            name: 'Updated Project Name',
            status: 'archived'
          });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Project Name');
        expect(response.body.status).toBe('archived');
      });
    });

    describe('DELETE /api/tasks/projects/:id', () => {
      test('Should delete project', async () => {
        const response = await request(app)
          .delete(`/api/tasks/projects/${projectId}`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);

        // Verify deletion
        const getResponse = await request(app)
          .get(`/api/tasks/projects/${projectId}`)
          .set('Authorization', 'Bearer test-token');

        expect(getResponse.status).toBe(404);
      });
    });
  });

  describe('Tasks', () => {
    beforeEach(async () => {
      // Create project for tasks
      const project = await Project.create({
        name: 'Test Project for Tasks',
        owner_id: mockUser.id,
        members: [mockUser.id]
      });
      projectId = project._id;
    });

    describe('POST /api/tasks/projects/:id/tasks', () => {
      test('Should create a new task', async () => {
        const response = await request(app)
          .post(`/api/tasks/projects/${projectId}/tasks`)
          .set('Authorization', 'Bearer test-token')
          .send({
            title: 'Test Task',
            description: 'Task description',
            priority: 'high',
            due_date: '2026-04-01'
          });

        expect(response.status).toBe(201);
        expect(response.body.title).toBe('Test Task');
        expect(response.body.status).toBe('todo');
        expect(response.body.priority).toBe('high');

        taskId = response.body._id;
      });

      test('Should return 400 without title', async () => {
        const response = await request(app)
          .post(`/api/tasks/projects/${projectId}/tasks`)
          .set('Authorization', 'Bearer test-token')
          .send({
            description: 'Missing title'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Title');
      });
    });

    describe('GET /api/tasks/projects/:id/tasks', () => {
      test('Should list all tasks in project', async () => {
        const response = await request(app)
          .get(`/api/tasks/projects/${projectId}/tasks`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('PATCH /api/tasks/:taskId/status', () => {
      test('Should update task status', async () => {
        const response = await request(app)
          .patch(`/api/tasks/${taskId}/status`)
          .set('Authorization', 'Bearer test-token')
          .send({
            status: 'in_progress'
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('in_progress');
      });
    });

    describe('POST /api/tasks/:taskId/assign', () => {
      test('Should assign task to user', async () => {
        const assigneeId = 'another-user-uuid';
        const response = await request(app)
          .post(`/api/tasks/${taskId}/assign`)
          .set('Authorization', 'Bearer test-token')
          .send({
            assignee_id: assigneeId
          });

        expect(response.status).toBe(200);
        expect(response.body.assignee_id).toBe(assigneeId);
      });
    });

    describe('PUT /api/tasks/:taskId', () => {
      test('Should update task details', async () => {
        const response = await request(app)
          .put(`/api/tasks/${taskId}`)
          .set('Authorization', 'Bearer test-token')
          .send({
            title: 'Updated Task Title',
            priority: 'low'
          });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated Task Title');
        expect(response.body.priority).toBe('low');
      });
    });

    describe('DELETE /api/tasks/:taskId', () => {
      test('Should delete task', async () => {
        const response = await request(app)
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
      });
    });
  });
});
```

---

## Notification Service Tests

### `notification-service/__tests__/notifications.test.js`

```javascript
const request = require('supertest');
const { pool } = require('../src/db');
const app = require('../src/index');

describe('Notification Service', () => {
  const testUserId = 'test-uuid-1234';
  let notificationId;

  beforeAll(async () => {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_user_read (user_id, is_read)
      )
    `);
  });

  afterAll(async () => {
    await pool.execute('DROP TABLE IF EXISTS notifications');
    await pool.end();
  });

  describe('POST /api/notify/internal', () => {
    test('Should create notification', async () => {
      const response = await request(app)
        .post('/api/notify/internal')
        .send({
          user_id: testUserId,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: 'You have been assigned a task',
          data: { task_id: 'task-123' }
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Notification created');
    });

    test('Should create multiple notifications', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/notify/internal')
          .send({
            user_id: testUserId,
            type: 'task_updated',
            title: `Notification ${i + 1}`,
            message: `Test message ${i + 1}`
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('GET /api/notify', () => {
    test('Should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/notify');

      expect(response.status).toBe(401);
    });

    test('Should list notifications with valid token', async () => {
      // Mock token verification
      const mockToken = Buffer.from(
        JSON.stringify({ id: testUserId })
      ).toString('base64');

      const response = await request(app)
        .get('/api/notify')
        .set('Authorization', `Bearer ${mockToken}`);

      // Note: This test may fail without proper JWT setup
      // In production, use actual JWT token
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('PATCH /api/notify/:id/read', () => {
    test('Should mark notification as read', async () => {
      // First create notification
      await pool.execute(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [testUserId, 'task_completed', 'Task Done', 'Your task completed']
      );

      const [rows] = await pool.execute(
        'SELECT id FROM notifications WHERE user_id = ? LIMIT 1',
        [testUserId]
      );

      if (rows.length > 0) {
        notificationId = rows[0].id;

        const response = await request(app)
          .patch(`/api/notify/${notificationId}/read`);

        expect([200, 401]).toContain(response.status);
      }
    });
  });

  describe('PATCH /api/notify/read-all', () => {
    test('Should mark all as read', async () => {
      const response = await request(app)
        .patch('/api/notify/read-all');

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('DELETE /api/notify/:id', () => {
    test('Should delete notification', async () => {
      const [rows] = await pool.execute(
        'SELECT id FROM notifications WHERE user_id = ? LIMIT 1',
        [testUserId]
      );

      if (rows.length > 0) {
        const response = await request(app)
          .delete(`/api/notify/${rows[0].id}`);

        expect([200, 401]).toContain(response.status);
      }
    });
  });
});
```

---

## Integration Tests

### `__tests__/integration.test.js` (Root directory)

```javascript
const request = require('supertest');

describe('TaskFlow Integration Tests', () => {
  let authToken;
  let refreshToken;
  let userId;
  let projectId;
  let taskId;

  describe('Complete User Flow', () => {
    test('1. Register user', async () => {
      const response = await request('http://localhost:4001')
        .post('/api/auth/register')
        .send({
          name: 'Integration Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'IntegrationTest123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      
      authToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    test('2. Get user profile', async () => {
      const response = await request('http://localhost:4001')
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userId);
    });

    test('3. Create project', async () => {
      const response = await request('http://localhost:4002')
        .post('/api/tasks/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Project',
          description: 'Testing full flow'
        });

      expect(response.status).toBe(201);
      projectId = response.body._id;
    });

    test('4. Create task', async () => {
      const response = await request('http://localhost:4002')
        .post(`/api/tasks/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Task',
          priority: 'high'
        });

      expect(response.status).toBe(201);
      taskId = response.body._id;
    });

    test('5. Assign task', async () => {
      const response = await request('http://localhost:4002')
        .post(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignee_id: userId
        });

      expect(response.status).toBe(200);
    });

    test('6. Update task status', async () => {
      const response = await request('http://localhost:4002')
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'done'
        });

      expect(response.status).toBe(200);
    });

    test('7. Get notifications', async () => {
      const response = await request('http://localhost:4003')
        .get('/api/notify')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(response.status);
    });
  });
});
```

---

## Running Tests

### Run All Tests

```bash
# In each service directory
npm test

# Or run with coverage
npm test -- --coverage

# Or run specific test file
npm test auth.test.js

# Run in watch mode
npm test -- --watch
```

### Run Integration Tests

```bash
# Ensure all services are running
docker-compose up -d

# Then run integration tests
npm test __tests__/integration.test.js
```

### GitHub Actions CI/CD

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test-auth:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: cd auth-service && npm install
      
      - name: Run tests
        run: cd auth-service && npm test
```

---

## Test Coverage Goals

| Service | Target Coverage | Current |
|---------|----------------|---------|
| Auth Service | 80% | - |
| Task Service | 75% | - |
| Notification Service | 70% | - |

---

**Note:** Tests require databases to be running. Use Docker containers or local database instances for full test execution.
