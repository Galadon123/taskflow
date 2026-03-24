# DATABASE SCHEMAS — Complete Data Model Reference

This document details all database schemas used across the TaskFlow microservice project. The system uses three independent databases per the microservices architecture.

## Table of Contents

1. [PostgreSQL (Auth Service)](#postgresql-auth-service)
2. [MongoDB (Task Service)](#mongodb-task-service)
3. [MySQL (Notification Service)](#mysql-notification-service)
4. [Database Relationships](#database-relationships)
5. [Indexing Strategy](#indexing-strategy)
6. [Data Initialization](#data-initialization)

---

## PostgreSQL (Auth Service)

**Service:** Auth Service  
**Port:** 5432  
**Database Name:** `taskflow_auth`  
**Host:** `postgres` (Docker network)

### Schema Overview

PostgreSQL stores user authentication data with strong consistency guarantees.

```
┌─────────────────────────────────────────────┐
│              PostgreSQL DB                   │
├─────────────────────────────────────────────┤
│ • users (authentication)                     │
│ • refresh_tokens (session management)        │
│ • audit_logs (optional future)              │
└─────────────────────────────────────────────┘
```

---

### Table: users

Stores user authentication and profile information.

**SQL Definition:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  role VARCHAR(50) DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| name | VARCHAR(255) | NOT NULL | User's display name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email address (login credential) |
| password_hash | VARCHAR(255) | NOT NULL | bcryptjs hashed password (12 rounds) |
| avatar | VARCHAR(500) | NULL | Avatar image URL |
| role | VARCHAR(50) | DEFAULT 'member' | User role (member, admin, etc.) |
| is_active | BOOLEAN | DEFAULT true | Account active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

**Sample Record:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lm",
  "avatar": "https://example.com/avatars/john.jpg",
  "role": "member",
  "is_active": true,
  "created_at": "2024-03-24T10:30:00Z",
  "updated_at": "2024-03-24T10:30:00Z"
}
```

---

### Table: refresh_tokens

Stores active refresh tokens for session management and logout functionality.

**SQL Definition:**
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Token record identifier |
| user_id | UUID | NOT NULL, FK(users) | User who owns token |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE | Hashed token for verification |
| expires_at | TIMESTAMP | NOT NULL | Token expiration time (7 days) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Token issue time |

**Sample Record:**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "token_hash": "$2b$12$hash...",
  "expires_at": "2024-03-31T10:30:00Z",
  "created_at": "2024-03-24T10:30:00Z"
}
```

**Maintenance:**
- Expired tokens should be cleaned up daily via cron job
- NULL tokens after logout to invalidate sessions

---

## MongoDB (Task Service)

**Service:** Task Service  
**Port:** 27017  
**Database Name:** `taskflow_tasks`  
**Host:** `mongodb` (Docker network)

### Schema Overview

MongoDB stores project and task data with flexible schema design.

```
┌──────────────────────────────────────────────┐
│           MongoDB Database                    │
├──────────────────────────────────────────────┤
│ • projects (collection)                       │
│ • tasks (collection)                          │
│ • activity_logs (optional future)             │
└──────────────────────────────────────────────┘
```

---

### Collection: projects

Stores project metadata and member information.

**Mongoose Schema:**
```javascript
const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    owner_id: {
      type: String,
      required: true
    },
    members: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active'
    },
    tags: {
      type: [String],
      default: []
    },
    settings: {
      visibility: {
        type: String,
        enum: ['private', 'public'],
        default: 'private'
      },
      allow_comments: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ owner_id: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ created_at: -1 });
```

**Document Fields:**

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | MongoDB auto-generated ID |
| name | String | Project name |
| description | String | Project description |
| owner_id | String | UUID of project owner |
| members | Array[String] | Array of UUID of member IDs |
| status | String | Project status (active, archived, completed) |
| tags | Array[String] | Project tags for categorization |
| settings | Object | Project-level settings |
| createdAt | Date | ISO 8601 creation timestamp |
| updatedAt | Date | ISO 8601 last update timestamp |

**Sample Document:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Website Redesign",
  "description": "Complete redesign of company website",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "members": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "status": "active",
  "tags": ["web", "design", "priority-high"],
  "settings": {
    "visibility": "private",
    "allow_comments": true
  },
  "createdAt": "2024-03-24T10:30:00.000Z",
  "updatedAt": "2024-03-24T10:30:00.000Z"
}
```

---

### Collection: tasks

Stores individual task data with assignment and status tracking.

**Mongoose Schema:**
```javascript
const taskSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'cancelled'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    assignee_id: {
      type: String,
      default: null
    },
    created_by: {
      type: String,
      required: true
    },
    due_date: {
      type: Date,
      default: null
    },
    tags: {
      type: [String],
      default: []
    },
    comments: [
      {
        user_id: String,
        text: String,
        created_at: {
          type: Date,
          default: Date.now
        }
      }
    ],
    attachments: [
      {
        url: String,
        name: String,
        size: Number,
        uploaded_at: {
          type: Date,
          default: Date.now
        }
      }
    ],
    activity_log: [
      {
        action: String,
        user_id: String,
        changes: Object,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ assignee_id: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ created_at: -1 });
```

**Document Fields:**

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Task ID |
| project_id | ObjectId | Reference to parent project |
| title | String | Task name |
| description | String | Detailed task description |
| status | String | Current status (todo, in_progress, done, cancelled) |
| priority | String | Priority level (low, medium, high, urgent) |
| assignee_id | String | UUID of assigned user (null if unassigned) |
| created_by | String | UUID of task creator |
| due_date | Date | ISO 8601 due date (null if not set) |
| tags | Array[String] | Task tags/labels |
| comments | Array[Object] | Comments on task (user_id, text, created_at) |
| attachments | Array[Object] | File attachments with metadata |
| activity_log | Array[Object] | Log of all changes and interactions |
| createdAt | Date | Task creation timestamp |
| updatedAt | Date | Last modification timestamp |

**Sample Document:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "project_id": "507f1f77bcf86cd799439011",
  "title": "Design UI mockups",
  "description": "Create Figma mockups for new homepage design",
  "status": "in_progress",
  "priority": "high",
  "assignee_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_by": "550e8400-e29b-41d4-a716-446655440001",
  "due_date": "2024-04-15T00:00:00.000Z",
  "tags": ["design", "ui", "figma"],
  "comments": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "Started working on desktop version",
      "created_at": "2024-03-24T14:30:00.000Z"
    }
  ],
  "attachments": [
    {
      "url": "https://storage.example.com/attachments/sketch.fig",
      "name": "Homepage Sketch",
      "size": 2048576,
      "uploaded_at": "2024-03-24T14:00:00.000Z"
    }
  ],
  "activity_log": [
    {
      "action": "created",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "changes": {},
      "timestamp": "2024-03-24T10:30:00.000Z"
    },
    {
      "action": "assigned",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "changes": {
        "assignee_id": null,
        "new_assignee_id": "550e8400-e29b-41d4-a716-446655440000"
      },
      "timestamp": "2024-03-24T11:00:00.000Z"
    }
  ],
  "createdAt": "2024-03-24T10:30:00.000Z",
  "updatedAt": "2024-03-24T14:30:00.000Z"
}
```

---

## MySQL (Notification Service)

**Service:** Notification Service  
**Port:** 3306  
**Database Name:** `taskflow_notifications`  
**Host:** `mysql` (Docker network)

### Schema Overview

MySQL provides transactional notifications with fast read operations.

```
┌──────────────────────────────────────────────┐
│            MySQL Database                     │
├──────────────────────────────────────────────┤
│ • notifications (event tracking)              │
│ • notification_preferences (user settings)    │
│ • notification_templates (optional future)    │
└──────────────────────────────────────────────┘
```

---

### Table: notifications

Stores all user notifications with read status tracking.

**SQL Definition:**
```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Notification ID |
| user_id | VARCHAR(36) | NOT NULL, FK | UUID of notification recipient |
| type | VARCHAR(50) | NOT NULL | Notification type (task_assigned, etc.) |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Full notification message |
| data | JSON | NULL | Additional context as JSON |
| is_read | BOOLEAN | DEFAULT FALSE | Read status flag |
| read_at | TIMESTAMP | NULL | When user read notification |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

**Sample Records:**
```sql
INSERT INTO notifications (user_id, type, title, message, data) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'task_assigned',
  'Task Assigned',
  'You have been assigned to {Design UI mockups} in project {Website Redesign}',
  '{"task_id": "507f1f77bcf86cd799439013", "project_id": "507f1f77bcf86cd799439011", "task_title": "Design UI mockups"}'
);

INSERT INTO notifications (user_id, type, title, message, data) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'task_completed',
  'Task Completed',
  'Your task {API Implementation} was marked done',
  '{"task_id": "507f1f77bcf86cd799439014", "completed_by": "550e8400-e29b-41d4-a716-446655440000"}'
);
```

**Notification Types:**
- `task_assigned` - User assigned to task
- `task_updated` - Task details changed
- `task_completed` - Task marked as done
- `task_commented` - Comment added to assigned task
- `project_invite` - Added to project
- `project_updated` - Project details changed

---

### Table: notification_preferences

Stores user notification settings (optional, for future enhancement).

**SQL Definition:**
```sql
CREATE TABLE notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  task_assigned BOOLEAN DEFAULT TRUE,
  task_updated BOOLEAN DEFAULT TRUE,
  task_completed BOOLEAN DEFAULT TRUE,
  task_commented BOOLEAN DEFAULT TRUE,
  project_invite BOOLEAN DEFAULT TRUE,
  project_updated BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_prefs_user_id FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Database Relationships

### Cross-Service References

```
┌─────────────────────────────────────────────────────────────┐
│                  Database Relationships                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PostgreSQL (users)                                          │
│       │                                                      │
│       ├─→ refresh_tokens (session tokens)                   │
│       │                                                      │
│       │   (FK constraint: user_id → users.id)               │
│       │                                                      │
│       └─→ MySQL notifications (via user_id reference)       │
│                                                              │
│  MongoDB projects                                            │
│       │                                                      │
│       ├─ owner_id: references PostgreSQL users.id           │
│       ├─ members[]: array of PostgreSQL user IDs            │
│       │                                                      │
│       └─→ MongoDB tasks (project_id FK)                     │
│                                                              │
│  MongoDB tasks                                               │
│       │                                                      │
│       ├─ assignee_id: references PostgreSQL users.id        │
│       ├─ created_by: references PostgreSQL users.id         │
│       │                                                      │
│       └─→ MySQL notifications (via internal API call)       │
│                                                              │
│  Service Communication Pattern:                             │
│  Task Service → (HTTP REST) → Notification Service         │
│       └─ Creates notification records via internal endpoint │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Task Assignment

1. **React Frontend** sends PATCH request to Task Service
2. **Task Service** updates task.assignee_id in MongoDB
3. **Task Service** calls Notification Service internal endpoint
4. **Notification Service** inserts record into MySQL notifications table
5. **React Frontend** polls `/api/notify` to fetch new notifications
6. **User sees** notification in UI

---

## Indexing Strategy

### PostgreSQL Indexes

```sql
-- Primary indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Composite indexes (future optimization)
CREATE INDEX idx_refresh_tokens_cleanup ON refresh_tokens(user_id, expires_at)
WHERE expires_at < CURRENT_TIMESTAMP;
```

**Rationale:**
- `users.email` - Frequently used in login queries
- `users.is_active` - Filters for active users
- `refresh_tokens.user_id` - Finds tokens by user
- `refresh_tokens.expires_at` - Cleanup queries

### MongoDB Indexes

```javascript
// Indexes are automatically created by Mongoose

// projects collection
db.projects.createIndex({ owner_id: 1 });
db.projects.createIndex({ members: 1 });
db.projects.createIndex({ created_at: -1 });

// tasks collection
db.tasks.createIndex({ project_id: 1, status: 1 });
db.tasks.createIndex({ assignee_id: 1 });
db.tasks.createIndex({ due_date: 1 });
db.tasks.createIndex({ created_at: -1 });
```

**Rationale:**
- `projects.owner_id` - Quick owner lookups
- `projects.members` - Find projects user belongs to
- `tasks.project_id + status` - Filter tasks by project and status
- `tasks.assignee_id` - Find tasks assigned to user
- `tasks.due_date` - Sort by due date

### MySQL Indexes

```sql
-- Primary indexes
CREATE INDEX idx_user_id ON notifications(user_id);
CREATE INDEX idx_created_at ON notifications(created_at);
CREATE INDEX idx_is_read ON notifications(is_read);
CREATE INDEX idx_type ON notifications(type);

-- Composite indexes
CREATE INDEX idx_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_user_created ON notifications(user_id, created_at);
```

**Rationale:**
- `user_id` - Retrieve notifications for specific user
- `is_read` - Filter unread notifications
- `created_at` - Sort by recency
- Composite indexes - Common filter combinations

---

## Data Initialization

### Database Setup Scripts

**PostgreSQL Initialization:**
```bash
# Inside postgres container
psql -U postgres -c "CREATE DATABASE taskflow_auth;"
psql -U taskflow -d taskflow_auth < /scripts/init-postgres.sql
```

**MongoDB Initialization:**
```bash
# Inside mongo container
mongo taskflow_tasks /scripts/init-mongo.js
```

**MySQL Initialization:**
```bash
# Inside mysql container
mysql -u root -p$MYSQL_ROOT_PASSWORD < /scripts/init-mysql.sql
```

### Sample Data Seeding

**PostgreSQL Sample User:**
```sql
INSERT INTO users (name, email, password_hash, role) VALUES (
  'Demo User',
  'demo@example.com',
  '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lm',
  'member'
);
-- Password: demo123
```

---

## Query Examples

### Common Queries

**Find all projects for a user:**
```javascript
// MongoDB
db.projects.find({
  $or: [
    { owner_id: userId },
    { members: userId }
  ]
});
```

**Get unread notification count:**
```sql
-- MySQL
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = ? AND is_read = FALSE;
```

**Find tasks due in next 7 days:**
```javascript
// MongoDB
db.tasks.find({
  due_date: {
    $gte: new Date(),
    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  status: { $ne: 'done' }
});
```

---

**Next:** Read [Deployment Guide](./DEPLOYMENT.md) for production deployment instructions.
