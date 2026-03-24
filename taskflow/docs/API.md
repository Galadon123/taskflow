# API REFERENCE — Complete Endpoint Documentation

All API endpoints are accessible through the API Gateway at `http://localhost:8080`.

## Table of Contents

1. [Authentication Service](#authentication-service)
2. [Task Service](#task-service)
3. [Notification Service](#notification-service)
4. [Error Handling](#error-handling)
5. [Request/Response Examples](#requestresponse-examples)
6. [Headers & Authentication](#headers--authentication)

---

## Authentication Service

**Base URL:** `http://localhost:8080/api/auth`

**Database:** PostgreSQL  
**Port:** 4001 (Internal)

### 1. Register User

Register a new user account.

```
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "created_at": "2024-03-24T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Name, email and password are required` | Missing required field |
| 409 | `Email already registered` | User already exists |
| 500 | `Server error` | Internal server error |

**Notes:**
- Passwords are hashed with bcryptjs (12 salt rounds)
- Email must be unique
- Access token expires in 15 minutes
- Refresh token expires in 7 days

---

### 2. Login

Authenticate user and receive JWT tokens.

```
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "created_at": "2024-03-24T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Invalid credentials` | Wrong email or password |
| 500 | `Server error` | Internal server error |

**Notes:**
- Returns same token structure as register
- Tokens are stored in localStorage or cookies
- Valid credentials required even after registration

---

### 3. Get Current User

Retrieve authenticated user's profile information.

```
GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "role": "member",
  "created_at": "2024-03-24T10:30:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `No token provided` | Missing Authorization header |
| 401 | `Invalid token` | Token signature is invalid |
| 404 | `User not found` | User was deleted |
| 500 | `Server error` | Internal server error |

**Notes:**
- Requires valid JWT in Authorization header
- Returns full user details including avatar
- Used to verify token validity

---

### 4. Update Profile

Update authenticated user's profile information.

```
PUT /api/auth/me
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Updated",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

Both fields are optional. Only provided fields are updated.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Updated",
  "email": "john@example.com",
  "avatar": "https://example.com/new-avatar.jpg",
  "role": "member"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `No token provided` | Missing Authorization header |
| 401 | `Invalid token` | Token signature is invalid |
| 500 | `Server error` | Internal server error |

**Notes:**
- Requires valid JWT token
- Email cannot be changed via this endpoint
- Password change requires separate endpoint (not implemented)

---

### 5. Logout

Invalidate refresh token and logout user.

```
POST /api/auth/logout
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 500 | `Server error` | Internal server error |

**Notes:**
- Refresh token is removed from database
- Access token cannot be revoked (stateless)
- Client should clear local token storage

---

## Task Service

**Base URL:** `http://localhost:8080/api/tasks`

**Database:** MongoDB  
**Port:** 4002 (Internal)

### Task Service Authentication

All Task Service endpoints require JWT authentication. The service validates tokens by calling the Auth Service internally.

```
Authorization: Bearer ACCESS_TOKEN
```

The service:
1. Extracts token from Authorization header
2. Calls Auth Service: `GET http://auth-service:4001/api/auth/me`
3. Sets `req.user` with authenticated user data
4. Proceeds if valid, returns 401 if invalid

---

### Projects Endpoints

#### List All Projects

Retrieve all projects for authenticated user (owned or member).

```
GET /api/tasks/projects
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Website Redesign",
    "description": "Redesign company website",
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "members": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ],
    "status": "active",
    "created_at": "2024-03-24T10:30:00Z",
    "updated_at": "2024-03-24T10:30:00Z"
  }
]
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `No token provided` | Missing token |
| 401 | `Unauthorized` | Invalid token |
| 500 | `Server error` | Database error |

---

#### Create Project

Create a new project.

```
POST /api/tasks/projects
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Mobile App Development",
  "description": "Build iOS and Android app"
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Mobile App Development",
  "description": "Build iOS and Android app",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "members": ["550e8400-e29b-41d4-a716-446655440000"],
  "status": "active",
  "created_at": "2024-03-24T11:00:00Z",
  "updated_at": "2024-03-24T11:00:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Project name is required` | Missing name |
| 401 | `Unauthorized` | Invalid token |
| 500 | `Server error` | Database error |

**Notes:**
- Creator is automatically added as owner and member
- Status defaults to 'active'

---

#### Get Project Details

Retrieve specific project information.

```
GET /api/tasks/projects/:id
Authorization: Bearer ACCESS_TOKEN
```

**Path Parameters:**
- `id` - Project ObjectId (MongoDB)

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Website Redesign",
  "description": "Redesign company website",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "members": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "status": "active",
  "created_at": "2024-03-24T10:30:00Z",
  "updated_at": "2024-03-24T10:30:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Project not found` | Project doesn't exist |
| 401 | `Unauthorized` | Invalid token |
| 500 | `Server error` | Database error |

---

#### Update Project

Update project details.

```
PUT /api/tasks/projects/:id
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "archived"
}
```

All fields optional.

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Updated Project Name",
  "description": "Updated description",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "members": [...],
  "status": "archived",
  "created_at": "2024-03-24T10:30:00Z",
  "updated_at": "2024-03-24T11:30:00Z"
}
```

---

#### Delete Project

Delete a project and all associated tasks.

```
DELETE /api/tasks/projects/:id
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "Project deleted"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Project not found` | Project doesn't exist |
| 401 | `Unauthorized` | Invalid token |
| 500 | `Server error` | Database error |

---

### Tasks Endpoints

#### List Project Tasks

Retrieve all tasks in a specific project.

```
GET /api/tasks/projects/:id/tasks
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "project_id": "507f1f77bcf86cd799439011",
    "title": "Design UI mockups",
    "description": "Create Figma mockups for new design",
    "status": "in_progress",
    "priority": "high",
    "assignee_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "due_date": "2024-04-15T00:00:00Z",
    "tags": ["design", "ui"],
    "created_at": "2024-03-24T10:30:00Z",
    "updated_at": "2024-03-24T10:30:00Z"
  }
]
```

---

#### Create Task

Create a new task in a project.

```
POST /api/tasks/projects/:id/tasks
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT auth to API",
  "priority": "high",
  "due_date": "2024-04-20"
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "project_id": "507f1f77bcf86cd799439011",
  "title": "Implement user authentication",
  "description": "Add JWT auth to API",
  "status": "todo",
  "priority": "high",
  "assignee_id": null,
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "due_date": "2024-04-20T00:00:00Z",
  "tags": [],
  "created_at": "2024-03-24T11:30:00Z",
  "updated_at": "2024-03-24T11:30:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Title is required` | Missing task title |
| 401 | `Unauthorized` | Invalid token |
| 500 | `Server error` | Database error |

**Defaults:**
- status: 'todo'
- priority: 'medium'
- assignee_id: null

---

#### Get Task Details

Retrieve specific task information.

```
GET /api/tasks/:taskId
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "project_id": "507f1f77bcf86cd799439011",
  "title": "Design UI mockups",
  "description": "Create Figma mockups for new design",
  "status": "in_progress",
  "priority": "high",
  "assignee_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "due_date": "2024-04-15T00:00:00Z",
  "tags": ["design", "ui"],
  "created_at": "2024-03-24T10:30:00Z",
  "updated_at": "2024-03-24T10:30:00Z"
}
```

---

#### Update Task

Update task details.

```
PUT /api/tasks/:taskId
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "priority": "medium",
  "due_date": "2024-05-01"
}
```

---

#### Update Task Status

Update only the task status.

```
PATCH /api/tasks/:taskId/status
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "done"
}
```

**Valid Status Values:**
- `todo`
- `in_progress`
- `done`

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "status": "done",
  ...
}
```

**Side Effects:**
- If status changes to 'done' and task is assigned, notification is sent to assignee

---

#### Assign Task

Assign task to a user.

```
POST /api/tasks/:taskId/assign
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "assignee_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "assignee_id": "550e8400-e29b-41d4-a716-446655440001",
  ...
}
```

**Side Effects:**
- Notification sent to assigned user via Notification Service

---

#### Delete Task

Delete a task.

```
DELETE /api/tasks/:taskId
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "Task deleted"
}
```

---

## Notification Service

**Base URL:** `http://localhost:8080/api/notify`

**Database:** MySQL  
**Port:** 4003 (Internal)

### User Notifications Endpoints

#### List Notifications

Get user's notifications.

```
GET /api/notify
Authorization: Bearer ACCESS_TOKEN
```

**Query Parameters:**
- `limit` - Number of notifications (default: 50)
- `skip` - Pagination offset (default: 0)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "task_assigned",
    "title": "Task Assigned",
    "message": "You have been assigned 'Design UI mockups'",
    "data": {
      "task_id": "507f1f77bcf86cd799439013",
      "project_id": "507f1f77bcf86cd799439011"
    },
    "is_read": false,
    "created_at": "2024-03-24T10:30:00Z"
  }
]
```

**Notification Types:**
- `task_assigned` - User assigned to task
- `task_updated` - Task details changed
- `task_completed` - Task marked as done
- `project_invite` - Added to project

---

#### Mark Notification as Read

Mark a single notification as read.

```
PATCH /api/notify/:id/read
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "Marked as read"
}
```

---

#### Mark All as Read

Mark all notifications as read for user.

```
PATCH /api/notify/read-all
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "All marked as read"
}
```

---

#### Delete Notification

Delete a single notification.

```
DELETE /api/notify/:id
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "Notification deleted"
}
```

---

#### Get Unread Count

Get count of unread notifications.

```
GET /api/notify/unread-count
Authorization: Bearer ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "unread_count": 3
}
```

---

### Internal Notification Endpoints

These endpoints are used by other services to create notifications. They don't require authentication.

#### Create Notification

Create a notification for a user (internal).

```
POST /api/notify/internal
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "task_assigned",
  "title": "Task Assigned",
  "message": "You have been assigned 'Implement API'",
  "data": {
    "task_id": "507f1f77bcf86cd799439014",
    "project_id": "507f1f77bcf86cd799439011"
  }
}
```

**Response (201 Created):**
```json
{
  "message": "Notification created"
}
```

**Called by:** Task Service when task is assigned or marked as done

---

## Error Handling

### Error Response Format

All errors follow the same format:

```json
{
  "error": "Error message describing the problem"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email already registered |
| 500 | Server Error | Internal server error |

### Common Error Scenarios

**Missing Authorization Header:**
```
Status: 401
{
  "error": "No token provided"
}
```

**Invalid Token:**
```
Status: 401
{
  "error": "Invalid token"
}
```

**Missing Required Field:**
```
Status: 400
{
  "error": "Name, email and password are required"
}
```

**Resource Not Found:**
```
Status: 404
{
  "error": "Project not found"
}
```

---

## Headers & Authentication

### Required Headers

All authenticated requests must include:

```
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

### JWT Token Format

Tokens follow the JWT (JSON Web Token) standard:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
  eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJtZW1iZXIiLCJpYXQiOjE3MTExMzQ2MDAsImV4cCI6MTcxMTEzNDkwMH0.
  TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

**Payload (decoded):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "role": "member",
  "iat": 1711134600,
  "exp": 1711134900
}
```

### Token Expiration

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

When access token expires, use refresh token to get a new one.

---

## Request/Response Examples

### Example 1: Complete Registration to Project Creation

#### Step 1: Register
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith",
    "email": "alice@example.com",
    "password": "securePass123"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid-1",
    "name": "Alice Smith",
    "email": "alice@example.com"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Step 2: Create Project
```bash
curl -X POST http://localhost:8080/api/tasks/projects \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q2 Marketing Campaign",
    "description": "Spring marketing initiatives"
  }'
```

Response:
```json
{
  "_id": "mongo-id-1",
  "name": "Q2 Marketing Campaign",
  "owner_id": "uuid-1",
  "status": "active"
}
```

#### Step 3: Create Task
```bash
curl -X POST http://localhost:8080/api/tasks/projects/mongo-id-1/tasks \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Create social media posts",
    "priority": "high"
  }'
```

#### Step 4: Assign Task
```bash
curl -X POST http://localhost:8080/api/tasks/mongo-task-id/assign \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_id": "uuid-2"
  }'
```

---

**Next:** Read [Database Schemas](./DATABASE.md) for data model details.
