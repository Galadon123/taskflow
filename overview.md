# TaskFlow — Microservice Project Overview

A full-stack task management platform built as a microservice architecture.
Use this project to test Puku Editor end-to-end: AI chat, code completions, semantic search, and Next Edit Suggestions.

---

## What You Are Building

**TaskFlow** is a project management app where users can:
- Register and log in (JWT auth)
- Create projects and tasks
- Assign tasks to team members
- Track task status (todo / in-progress / done)
- Receive notifications on task updates

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│               React (port 3000) / Next.js (port 3000)           │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                    Nginx (port 8080)                             │
│   /api/auth  →  Auth Service                                    │
│   /api/users →  Auth Service                                    │
│   /api/tasks →  Task Service                                    │
│   /api/notify → Notification Service                            │
└────┬─────────────────┬──────────────────┬───────────────────────┘
     │                 │                  │
     ▼                 ▼                  ▼
┌─────────┐     ┌────────────┐    ┌──────────────┐
│  Auth   │     │   Task     │    │ Notification │
│ Service │     │  Service   │    │   Service    │
│ :4001   │     │  :4002     │    │   :4003      │
└────┬────┘     └─────┬──────┘    └──────┬───────┘
     │                │                  │
     ▼                ▼                  ▼
┌─────────┐     ┌────────────┐    ┌──────────────┐
│PostgreSQL│    │  MongoDB   │    │    MySQL     │
│  :5432  │     │  :27017    │    │   :3306      │
└─────────┘     └────────────┘    └──────────────┘
```

---

## Tech Stack Variants

| Service | Option A (Node.js) | Option B (Python) | Option C (Go) |
|---------|-------------------|-------------------|---------------|
| Auth Service | Node.js + Express | FastAPI | Go + Gin |
| Task Service | Node.js + Express | FastAPI | Go + Gin |
| Notification | Node.js + Express | FastAPI | Go + Gin |
| Frontend | React | React | Next.js |
| Auth DB | PostgreSQL | PostgreSQL | PostgreSQL |
| Task DB | MongoDB | MongoDB | MySQL |
| Notify DB | MySQL | MySQL | MySQL |

---

## Project File Structure

```
taskflow/
├── auth-service/           # Authentication & user management
│   ├── src/
│   ├── Dockerfile
│   └── package.json / requirements.txt / go.mod
├── task-service/           # Task & project management
│   ├── src/
│   ├── Dockerfile
│   └── package.json / requirements.txt / go.mod
├── notification-service/   # Notifications & events
│   ├── src/
│   ├── Dockerfile
│   └── package.json / requirements.txt / go.mod
├── frontend/               # React or Next.js
│   ├── src/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf          # API Gateway config
├── docker-compose.yml      # Full stack
└── .github/
    └── workflows/
        └── ci.yml
```

---

## API Summary

### Auth Service (`/api/auth`)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (JWT required) |
| PUT | `/api/auth/me` | Update profile |
| POST | `/api/auth/logout` | Logout |

### Task Service (`/api/tasks`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks/projects` | List all projects |
| POST | `/api/tasks/projects` | Create project |
| GET | `/api/tasks/projects/:id` | Get project by ID |
| PUT | `/api/tasks/projects/:id` | Update project |
| DELETE | `/api/tasks/projects/:id` | Delete project |
| GET | `/api/tasks/projects/:id/tasks` | List tasks in project |
| POST | `/api/tasks/projects/:id/tasks` | Create task |
| GET | `/api/tasks/:taskId` | Get task by ID |
| PUT | `/api/tasks/:taskId` | Update task |
| DELETE | `/api/tasks/:taskId` | Delete task |
| PATCH | `/api/tasks/:taskId/status` | Update task status |
| POST | `/api/tasks/:taskId/assign` | Assign task to user |

### Notification Service (`/api/notify`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notify` | Get user notifications |
| PATCH | `/api/notify/:id/read` | Mark notification as read |
| PATCH | `/api/notify/read-all` | Mark all as read |
| DELETE | `/api/notify/:id` | Delete notification |

---

## Database Schemas

### PostgreSQL — Auth Service

```sql
-- users table
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    avatar      VARCHAR(500),
    role        VARCHAR(20) DEFAULT 'member',  -- 'admin' | 'member'
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- refresh_tokens table
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

### MongoDB — Task Service

```js
// Project schema
{
  _id: ObjectId,
  name: String,           // required
  description: String,
  owner_id: String,       // user UUID from auth service
  members: [String],      // array of user UUIDs
  status: String,         // 'active' | 'archived'
  created_at: Date,
  updated_at: Date
}

// Task schema
{
  _id: ObjectId,
  project_id: ObjectId,   // ref to Project
  title: String,          // required
  description: String,
  status: String,         // 'todo' | 'in_progress' | 'done'
  priority: String,       // 'low' | 'medium' | 'high'
  assignee_id: String,    // user UUID from auth service
  created_by: String,     // user UUID
  due_date: Date,
  tags: [String],
  created_at: Date,
  updated_at: Date
}
```

### MySQL — Notification Service

```sql
CREATE TABLE notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL,
    type        ENUM('task_assigned','task_updated','task_completed','project_invite') NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    data        JSON,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON notifications(user_id);
CREATE INDEX idx_is_read ON notifications(user_id, is_read);
```

---

## Environment Variables

### Auth Service
```env
PORT=4001
DATABASE_URL=postgresql://postgres:password@postgres:5432/taskflow_auth
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Task Service
```env
PORT=4002
MONGO_URI=mongodb://mongo:27017/taskflow_tasks
AUTH_SERVICE_URL=http://auth-service:4001
```

### Notification Service
```env
PORT=4003
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=taskflow_notify
TASK_SERVICE_URL=http://task-service:4002
```

### Frontend
```env
REACT_APP_API_URL=http://localhost:8080
# or for Next.js
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Quick Start (All Services)

```bash
# Clone or create the project
mkdir taskflow && cd taskflow

# Start all services with Docker Compose
docker compose up --build

# Access
# Frontend:  http://localhost:3000
# API:       http://localhost:8080
# Auth:      http://localhost:4001
# Tasks:     http://localhost:4002
# Notify:    http://localhost:4003
```

---

## Guides

| Guide | File |
|-------|------|
| Node.js Backend (Express + PostgreSQL + MongoDB + MySQL) | [nodejs-microservice.md](./nodejs-microservice.md) |
| Python Backend (FastAPI + PostgreSQL + MongoDB + MySQL) | [python-microservice.md](./python-microservice.md) |
| Go Backend (Gin + PostgreSQL + MongoDB + MySQL) | [golang-microservice.md](./golang-microservice.md) |
| React Frontend | [react-frontend.md](./react-frontend.md) |
| Next.js Frontend | [nextjs-frontend.md](./nextjs-frontend.md) |
| Docker Setup | [docker-setup.md](./docker-setup.md) |
| CI/CD with GitHub Actions | [cicd.md](./cicd.md) |
