# DEVELOPMENT GUIDE — Local Development Setup & Workflow

This guide covers setting up TaskFlow for local development, running services without Docker, debugging strategies, testing approaches, and code organization standards.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Running Services](#running-services)
4. [Database Setup](#database-setup)
5. [Frontend Development](#frontend-development)
6. [Debugging Techniques](#debugging-techniques)
7. [Testing Approaches](#testing-approaches)
8. [Code Organization Standards](#code-organization-standards)
9. [Git Workflow](#git-workflow)
10. [Common Development Tasks](#common-development-tasks)

---

## Prerequisites

### System Requirements

- **Node.js:** v20.x or later (use nvm for version management)
- **npm:** 10.x or later
- **PostgreSQL:** 16.x
- **MongoDB:** 7.x
- **MySQL:** 8.x
- **Git:** 2.40+

### Environment Setup

**Install nvm (Node Version Manager):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Verify installations:**

```bash
node --version           # v20.x.x
npm --version           # 10.x.x
psql --version          # PostgreSQL 16.x
mongo --version         # mongod version v7.x.x
mysql --version         # mysql Ver 8.x.x
```

---

## Local Development Setup

### Directory Structure

```
taskflow/
├── auth-service/
│   ├── src/
│   ├── .env.local
│   ├── package.json
│   └── nodemon.json
├── task-service/
│   ├── src/
│   ├── .env.local
│   ├── package.json
│   └── nodemon.json
├── notification-service/
│   ├── src/
│   ├── .env.local
│   ├── package.json
│   └── nodemon.json
├── taskflow-react-frontend/
│   ├── src/
│   ├── .env.local
│   └── package.json
├── taskflow-nextjs-frontend/
│   ├── src/
│   ├── .env.local
│   └── package.json
├── docker-compose.yml
└── README.md
```

### Global Development Tools

```bash
# Install globally
npm install -g nodemon         # Auto-restart on file changes
npm install -g postman         # API testing desktop app
npm install -g mongodb-compass  # MongoDB GUI client
npm install -g pgAdmin4        # PostgreSQL GUI client

# Or use Docker versions
# docker run -d -p 3000:3000 mongo-express
# docker run -d -p 5050:5050 dpage/pgadmin4
```

### .env.local for Each Service

**auth-service/.env.local:**
```bash
NODE_ENV=development
PORT=4001
LOG_LEVEL=debug

# PostgreSQL (local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow_auth_dev
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=dev_secret_key_min_32_chars_for_testing
JWT_REFRESH_SECRET=dev_refresh_secret_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**task-service/.env.local:**
```bash
NODE_ENV=development
PORT=4002
LOG_LEVEL=debug

# MongoDB (local)
MONGO_URI=mongodb://localhost:27017/taskflow_tasks_dev
MONGO_USER=taskflow
MONGO_PASSWORD=taskflow

# Service URLs (local)
AUTH_SERVICE_URL=http://localhost:4001
NOTIFY_SERVICE_URL=http://localhost:4003

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**notification-service/.env.local:**
```bash
NODE_ENV=development
PORT=4003
LOG_LEVEL=debug

# MySQL (local)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=taskflow_notifications_dev
DB_USER=root
DB_PASSWORD=root

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**Frontend (.env.local):**
```bash
REACT_APP_API_URL=http://localhost:8080
REACT_APP_LOG_LEVEL=debug
REACT_APP_DEBUG_MODE=true
```

---

## Running Services

### Service Startup Sequence

**Step 1: Start Databases**

```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE taskflow_auth_dev;"

# MongoDB
mongod --dbpath /data/db

# MySQL
mysql -u root
mysql> CREATE DATABASE taskflow_notifications_dev;
```

**Step 2: Start Backend Services**

Open 3 terminal windows:

```bash
# Terminal 1: Auth Service
cd auth-service
npm install
npm run dev

# Terminal 2: Task Service  
cd task-service
npm install
npm run dev

# Terminal 3: Notification Service
cd notification-service
npm install
npm run dev
```

**Step 3: Start Nginx Gateway (Optional)**

```bash
# Install nginx locally
brew install nginx  # macOS
# or
apt-get install nginx  # Linux

# Configure and start
cp nginx/nginx.conf /usr/local/etc/nginx/nginx.conf
nginx
```

Or use Docker for just Nginx:
```bash
docker run -d -p 8080:80 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:1.25-alpine
```

**Step 4: Start Frontend**

```bash
# Terminal 4: React Frontend
cd taskflow-react-frontend
npm install
npm run dev

# Or Next.js Frontend (alternative)
cd taskflow-nextjs-frontend
npm install
npm run dev
```

### Service Port Mapping

| Service | Port | URL |
|---------|------|-----|
| Auth Service | 4001 | http://localhost:4001 |
| Task Service | 4002 | http://localhost:4002 |
| Notification Service | 4003 | http://localhost:4003 |
| Nginx Gateway | 8080 | http://localhost:8080 |
| React Frontend | 5173 | http://localhost:5173 |
| Next.js Frontend | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |
| MySQL | 3306 | localhost:3306 |

---

## Database Setup

### PostgreSQL Local Setup

```bash
# Create database
createdb -U postgres taskflow_auth_dev

# Create tables
psql -U postgres -d taskflow_auth_dev -f scripts/init-postgres.sql

# Test connection
psql -U postgres -d taskflow_auth_dev -c "SELECT * FROM users;"
```

### MongoDB Local Setup

```bash
# Start MongoDB
mongod

# In another terminal, initialize database
mongo taskflow_tasks_dev < scripts/init-mongo.js

# View data
mongo
> use taskflow_tasks_dev
> db.projects.find()
```

### MySQL Local Setup

```bash
# Create database
mysql -u root -e "CREATE DATABASE taskflow_notifications_dev;"

# Initialize tables
mysql -u root taskflow_notifications_dev < scripts/init-mysql.sql

# Test connection
mysql -u root taskflow_notifications_dev -e "SHOW TABLES;"
```

### Database Reset (Development)

```bash
# PostgreSQL
dropdb -U postgres taskflow_auth_dev
createdb -U postgres taskflow_auth_dev
psql -U postgres -d taskflow_auth_dev -f scripts/init-postgres.sql

# MongoDB
mongo taskflow_tasks_dev --eval "db.dropDatabase();"
mongo taskflow_tasks_dev < scripts/init-mongo.js

# MySQL
mysql -u root -e "DROP DATABASE taskflow_notifications_dev;"
mysql -u root -e "CREATE DATABASE taskflow_notifications_dev;"
mysql -u root taskflow_notifications_dev < scripts/init-mysql.sql
```

---

## Frontend Development

### React Frontend Setup

```bash
cd taskflow-react-frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm build

# Run tests
npm test
```

**Vite Development Features:**
- Hot Module Replacement (HMR)
- Instant server start
- CSS modules support
- Automatic dependency optimization

**Debugging React:**

```javascript
// Add debug logging
import debug from 'debug';
const log = debug('app');

log('Component mounted:', props);

// React DevTools Browser Extension
// Install: https://react.dev/learn/react-developer-tools
```

### Next.js Frontend Setup

```bash
cd taskflow-nextjs-frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm build

# Run production server
npm start

# Run tests
npm test
```

**Next.js Development Features:**
- Fast Refresh
- API routes for backend
- Incremental Static Regeneration
- Built-in CSS/SCSS support
- Automatic code splitting

**Debugging Next.js:**

```bash
# Enable debug logging
NODE_DEBUG_INJECT=true npm run dev

# Or use VS Code debugger
# Add to .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach Next.js",
      "port": 9229,
      "protocol": "inspector"
    }
  ]
}
```

---

## Debugging Techniques

### Backend Debugging

**Option 1: Node Inspector**

```bash
# Start service with debugger
node --inspect-brk=0.0.0.0:9229 src/index.js

# Open Chrome: chrome://inspect
# Or VS Code: Run and Debug
```

**Option 2: VS Code Debugger**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Auth Service",
      "program": "${workspaceFolder}/auth-service/src/index.js",
      "cwd": "${workspaceFolder}/auth-service",
      "envFile": "${workspaceFolder}/auth-service/.env.local",
      "restart": true,
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Task Service",
      "program": "${workspaceFolder}/task-service/src/index.js",
      "cwd": "${workspaceFolder}/task-service",
      "envFile": "${workspaceFolder}/task-service/.env.local",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

**Option 3: Logging/Console**

```javascript
// Add debug logging in code
console.log('🔍 Debug:', { userId, projectId, error });

// Use debug module for conditional logging
const debug = require('debug')('taskflow:auth');
debug('User authenticated:', user.id);
```

**Option 4: Network Inspection**

```bash
# Install http debugging proxy
npm install -g http-server-debug

# Use with-axios
const axiosDebug = require('axios-debug-log');
axiosDebug({
  request: function (debug, config) {
    debug(`- Request method: ${config.method}`);
    debug(`- Request URL: ${config.url}`);
  },
  response: function (debug, response) {
    debug(`- Response status: ${response.status}`);
  }
});
```

### Frontend Debugging

**React DevTools:**
```bash
# Install browser extension for Firefox/Chrome
# https://react.dev/learn/react-developer-tools

# View component tree, props, state
```

**Browser Console:**
```javascript
// Access global state
window.__REDUX_DEVTOOLS_EXTENSION__

// Debug auth context
const authContext = useContext(AuthContext);
console.table(authContext);
```

**Network Tab (DevTools):**
- Monitor API calls to `/api/auth`, `/api/tasks`, `/api/notify`
- Verify token headers
- Check response payloads
- Monitor request/response timing

---

## Testing Approaches

### Unit Testing (Backend)

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Create test file: __tests__/auth.test.js
```

**Example Test:**
```javascript
// auth-service/__tests__/auth.test.js
const request = require('supertest');
const app = require('../src/index');

describe('Authentication', () => {
  test('POST /register - Success', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.accessToken).toBeDefined();
  });

  test('POST /login - Invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrong'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});

// Run tests
npm test
```

### Integration Testing (API)

```bash
# Use Postman or Insomnia for manual testing
# Or create automated integration tests

npm install --save-dev jest supertest
```

**Integration Test Sequence:**
```javascript
describe('Complete User Flow', () => {
  let accessToken, userId, projectId, taskId;

  test('1. Register User', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com', password: 'pass' });
    
    accessToken = response.body.accessToken;
    userId = response.body.user.id;
  });

  test('2. Create Project', async () => {
    const response = await request(app)
      .post('/api/tasks/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Project' });
    
    projectId = response.body._id;
  });

  test('3. Create Task', async () => {
    const response = await request(app)
      .post(`/api/tasks/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test Task' });
    
    taskId = response.body._id;
  });
});
```

### Frontend Testing

```bash
# React testing
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**React Component Test:**
```javascript
import { render, screen } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

test('LoginPage renders form', () => {
  render(
    <AuthContext.Provider value={{ user: null }}>
      <LoginPage />
    </AuthContext.Provider>
  );

  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
```

### Manual API Testing

**Using cURL:**
```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"pass123"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'

# Get projects (with token)
curl -X GET http://localhost:8080/api/tasks/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Using Postman:**
1. Import API documentation: `POSTMAN_COLLECTION.json`
2. Set environment variables for token
3. Create request collections for each flow

---

## Code Organization Standards

### Backend Service Structure

```
auth-service/
├── src/
│   ├── index.js              # Entry point, Express setup
│   ├── config/
│   │   └── database.js       # DB connection config
│   ├── middleware/
│   │   ├── auth.js           # JWT verification middleware
│   │   └── errorHandler.js   # Global error handling
│   ├── controllers/
│   │   └── authController.js # Request handlers
│   ├── models/
│   │   └── User.js           # Data models (ORM)
│   ├── routes/
│   │   └── auth.js           # Route definitions
│   ├── utils/
│   │   ├── jwt.js            # JWT utilities
│   │   └── validators.js     # Input validation
│   └── services/
│       └── userService.js    # Business logic
├── __tests__/
│   └── auth.test.js
├── .env.local
├── package.json
└── nodemon.json
```

### Naming Conventions

**Files:**
- Controllers: `camelCase` + `Controller`: `authController.js`
- Models: `PascalCase`: `User.js`
- Utils: `camelCase`: `jwt.js`
- Routes: `camelCase`: `auth.js`

**Variables & Functions:**
```javascript
// camelCase for variables and functions
const userId = '550e8400...';
function authenticateUser() {}
const passwordHash = await bcryptjs.hash(password);

// PascalCase for classes
class AuthService {}

// UPPER_CASE for constants
const JWT_EXPIRES_IN = 900; // 15 minutes
const DEFAULT_ROLE = 'member';
```

**Endpoints:**
```javascript
// RESTful conventions
GET    /api/tasks/projects              // List
POST   /api/tasks/projects              // Create
GET    /api/tasks/projects/:id          // Read
PUT    /api/tasks/projects/:id          // Update
DELETE /api/tasks/projects/:id          // Delete

// Nested resources
POST   /api/tasks/projects/:id/tasks    // Create task in project
GET    /api/tasks/projects/:id/tasks    // List project's tasks

// Actions
PATCH  /api/tasks/:taskId/status        // Status update
POST   /api/tasks/:taskId/assign        // Custom action
```

### Frontend Component Structure

**React:**
```
src/
├── components/          # Reusable components
│   ├── Navbar.jsx
│   ├── TaskCard.jsx
│   └── Modal/
│       └── CreateTaskModal.jsx
├── pages/              # Page components
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   └── ProjectPage.jsx
├── context/            # React Context
│   └── AuthContext.jsx
├── hooks/              # Custom React hooks
│   ├── useAuth.js
│   └── useApiCall.js
├── services/           # API calls
│   └── axios.js
├── styles/             # CSS/Tailwind
│   └── index.css
├── App.jsx
└── main.jsx
```

**Next.js:**
```
src/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── api/                 # API routes
│   │   └── auth/[...slug].ts
│   ├── (auth)/              # Route groups
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── dashboard/
│       └── page.tsx
├── components/              # Reusable components
├── lib/                     # Utilities
│   ├── api.ts
│   └── auth.ts
└── types/
    └── index.ts
```

---

## Git Workflow

### Branch Naming

```bash
feature/user-authentication
bugfix/token-expiration-issue
hotfix/database-connection-error
docs/api-documentation
chore/dependency-update
```

### Commit Messages

```bash
# Format: type(scope): description

feat(auth): implement JWT token refresh endpoint
fix(task-service): resolve MongoDB connection timeout
docs(api): update endpoint documentation
test(auth): add password validation tests
chore(deps): upgrade express to 4.18.2
```

### Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat(auth): add new endpoint"

# Keep up to date
git fetch origin
git rebase origin/main

# Push and create PR
git push origin feature/my-feature
```

---

## Common Development Tasks

### Add New Endpoint

**1. Create route handler:**
```javascript
// routes/auth.js
router.post('/refresh', async (req, res) => {
  // Implementation
});
```

**2. Add to controller:**
```javascript
// controllers/authController.js
exports.refreshToken = async (req, res) => {
  // Logic
};
```

**3. Write tests:**
```javascript
// __tests__/auth.test.js
test('POST /refresh - Success', async () => {
  // Test
});
```

### Add Database Migration

```bash
# MongoDB (Mongoose automatically handles schema)
# Just update model:
const newField = { type: String, default: 'value' };

# For existing data:
db.users.updateMany({}, { $set: { newField: 'value' } });
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update express

# Update all packages
npm update

# Verify no breaking changes
npm test
```

### Add New Environment Variable

1. Add to `.env.local`
2. Update `.env.example`
3. Verify in `config/` file
4. Document in DEVELOPMENT.md

---

**Next:** Read [Troubleshooting Guide](./TROUBLESHOOTING.md) for common issues and solutions.
