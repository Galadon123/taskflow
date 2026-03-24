# ARCHITECTURE — TaskFlow Microservice System Design

This document provides a comprehensive overview of the TaskFlow microservice architecture, including system design patterns, component interactions, and data flow.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Design Patterns](#design-patterns)
6. [Security Architecture](#security-architecture)

---

## System Overview

TaskFlow is built on a **distributed microservice architecture** with the following principles:

- **Separation of Concerns** - Each service handles a specific business domain
- **Independent Deployment** - Services can be updated without affecting others
- **Fault Isolation** - Service failures don't cascade to other services
- **API-First Design** - Services communicate via well-defined REST APIs
- **Database per Service** - Each service owns its data

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│                (React/Next.js Frontend)                  │
│                   :3000 (via Nginx)                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────┐
│                   API Gateway Layer                      │
│                    (Nginx Reverse Proxy)                │
│                   :8080 → Routes traffic                │
└──────┬────────────────┬────────────────┬────────────────┘
       │                │                │
   /api/auth        /api/tasks        /api/notify
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐
│  Business    │ │ Business   │ │ Business     │
│  Logic Layer │ │ Logic Layer│ │ Logic Layer  │
│   (Auth)     │ │   (Tasks)  │ │(Notifications)
└──────────────┘ └────────────┘ └──────────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐
│  Data Layer  │ │ Data Layer │ │  Data Layer  │
│ (PostgreSQL) │ │ (MongoDB)  │ │  (MySQL)     │
└──────────────┘ └────────────┘ └──────────────┘
```

---

## Architecture Diagram

### Complete System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                                │
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐         │
│  │  React Frontend      │      │  Next.js Frontend    │         │
│  │  (Vite)              │      │  (SSR/Static Gen)    │         │
│  │  Port: 3000          │      │  Port: 3000          │         │
│  │  ├─ Dashboard        │      │  ├─ Dashboard        │         │
│  │  ├─ Projects         │      │  ├─ Projects         │         │
│  │  ├─ Tasks            │      │  ├─ Tasks            │         │
│  │  └─ Auth Pages       │      │  └─ Auth Pages       │         │
│  └──────────────────────┘      └──────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP/WebSocket
                              │
┌──────────────────────────────────────────────────────────────────┐
│                    GATEWAY LAYER (Nginx)                          │
│                                                                   │
│  Port 8080 (Public Endpoint)                                     │
│  ├─ Request Routing                                              │
│  ├─ CORS Headers                                                 │
│  ├─ SSL/TLS Termination                                          │
│  ├─ Load Balancing                                               │
│  └─ Rate Limiting (Optional)                                     │
└──────────────────────────────────────────────────────────────────┘
         │                      │                      │
    /api/auth             /api/tasks             /api/notify
         │                      │                      │
         ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  AUTH SERVICE    │  │  TASK SERVICE    │  │  NOTIFY SERVICE  │
│  :4001           │  │  :4002           │  │  :4003           │
│                  │  │                  │  │                  │
│ Express.js       │  │ Express.js       │  │ Express.js       │
│ ├─ Controllers   │  │ ├─ Controllers   │  │ ├─ Controllers   │
│ ├─ Routes        │  │ ├─ Routes        │  │ ├─ Routes        │
│ ├─ Models        │  │ ├─ Models        │  │ ├─ Models        │
│ ├─ Middleware    │  │ ├─ Middleware    │  │ ├─ Middleware    │
│ │ ├─ Auth        │  │ │ ├─ Auth        │  │ │ ├─ Auth        │
│ │ └─ Error       │  │ │ └─ Error       │  │ │ └─ Error       │
│ └─ Utils         │  │ └─ Utils         │  │ └─ Utils         │
│                  │  │                  │  │                  │
│ Dependencies:    │  │ Dependencies:    │  │ Dependencies:    │
│ ├─ bcryptjs      │  │ ├─ mongoose      │  │ ├─ mysql2        │
│ ├─ jsonwebtoken  │  │ ├─ axios         │  │ ├─ cors          │
│ ├─ helmet        │  │ ├─ cors          │  │ └─ dotenv        │
│ └─ cors          │  │ └─ dotenv        │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │     MongoDB      │  │      MySQL       │
│   Port: 5432     │  │    Port: 27017   │  │    Port: 3306    │
│                  │  │                  │  │                  │
│  Databases:      │  │  Databases:      │  │  Databases:      │
│  ├─ authdb       │  │  ├─ taskdb       │  │  ├─ notifydb     │
│  └─ tables:      │  │  └─ collections: │  │  └─ tables:      │
│    ├─ users      │  │    ├─ projects   │  │    ├─ notif...   │
│    └─ tokens     │  │    └─ tasks      │  │    └─ indices    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Service Dependencies

```
┌─────────────────────────────────────────────────────┐
│            Frontend Applications                     │
│  (React & Next.js)                                  │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Depends on: API Gateway (Nginx)
                 │
┌────────────────▼────────────────────────────────────┐
│            API Gateway (Nginx)                       │
│  Routes requests to appropriate services            │
└────────┬─────────────────┬──────────────┬───────────┘
         │                 │              │
    Depends on:        Depends on:    Depends on:
    Auth Service       Task Service   Notify Service
         │                 │              │
         ▼                 ▼              ▼
    ┌────────────┐  ┌──────────────┐ ┌──────────────┐
    │Auth Service│  │Task Service  │ │Notify Service│
    │            │  │              │ │              │
    │Depends on: │  │Depends on:   │ │Depends on:   │
    │PostgreSQL  │  │├─ MongoDB    │ │├─ MySQL      │
    │            │  │└─ Auth Srv   │ │└─ No ext deps│
    └────────────┘  │  (validate)  │ └──────────────┘
                    └──────────────┘
```

---

## Component Details

### 1. Auth Service

**Purpose:** Centralized user authentication and authorization

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Password hashing and verification
- User profile management
- Token refresh mechanism

**Key Features:**
- Dual-token strategy (access + refresh)
- Secure password storage with bcryptjs (salt rounds: 12)
- JWT expiration management
- CORS-enabled endpoints

**Dependencies:**
- PostgreSQL for persistent user storage
- bcryptjs for password hashing
- jsonwebtoken for JWT creation

**API Endpoints:**
```
POST   /api/auth/register        → Create new user
POST   /api/auth/login           → Authenticate user
GET    /api/auth/me              → Get current user (protected)
PUT    /api/auth/me              → Update profile (protected)
POST   /api/auth/logout          → Logout (protected)
```

---

### 2. Task Service

**Purpose:** Project and task management business logic

**Responsibilities:**
- Project CRUD operations
- Task CRUD operations
- Task status tracking
- Task assignment
- Integration with Auth Service for validation
- Notification triggers

**Key Features:**
- Cross-service JWT validation
- Mongoose schema validation
- Task status workflow (todo → in_progress → done)
- Priority levels (low, medium, high)
- Task filtering and sorting

**Dependencies:**
- MongoDB for document storage
- Auth Service for token validation
- Notification Service for event publishing
- Axios for HTTP calls

**API Endpoints:**
```
GET    /api/tasks/projects                    → List all projects (protected)
POST   /api/tasks/projects                    → Create project (protected)
GET    /api/tasks/projects/:id                → Get project details
PUT    /api/tasks/projects/:id                → Update project
DELETE /api/tasks/projects/:id                → Delete project

GET    /api/tasks/projects/:id/tasks          → List tasks in project
POST   /api/tasks/projects/:id/tasks          → Create task
GET    /api/tasks/:taskId                     → Get task details
PUT    /api/tasks/:taskId                     → Update task
DELETE /api/tasks/:taskId                     → Delete task
PATCH  /api/tasks/:taskId/status              → Update task status
POST   /api/tasks/:taskId/assign              → Assign task to user
```

---

### 3. Notification Service

**Purpose:** Real-time notification management and delivery

**Responsibilities:**
- Notification creation and storage
- Read/unread status tracking
- Notification retrieval by user
- Bulk operations (mark all as read)
- Internal API for other services

**Key Features:**
- Persistent notification storage
- User-specific queries
- Notification type categorization
- JSON data support for rich notifications
- Timestamp tracking

**Dependencies:**
- MySQL for notification records
- Direct database access pattern (internal endpoints)

**API Endpoints:**
```
Authenticated Endpoints:
GET    /api/notify                  → List user notifications
PATCH  /api/notify/:id/read         → Mark notification as read
PATCH  /api/notify/read-all         → Mark all notifications as read
DELETE /api/notify/:id              → Delete notification
GET    /api/notify/unread-count     → Get unread count

Internal Endpoints (no auth):
POST   /api/notify/internal         → Create notification (from other services)
```

---

### 4. API Gateway (Nginx)

**Purpose:** Single entry point for all client requests

**Responsibilities:**
- Request routing to appropriate services
- CORS header management
- SSL/TLS termination (production)
- Load balancing across instances
- Request logging

**Features:**
- Upstream service health checks
- Connection pooling
- Gzip compression
- Security headers
- Request/response logging

**Configuration:**
```
Port: 8080 (Public)
├─ /api/auth/     → auth-service:4001
├─ /api/tasks/    → task-service:4002
├─ /api/notify/   → notification-service:4003
└─ /              → frontend:3000 (React/Next.js)
```

---

## Data Flow

### User Registration Flow

```
Client
  │
  ├─ POST /api/auth/register
  │   { name, email, password }
  │
  ▼ (via Nginx)
  
Auth Service
  │
  ├─ Validate input
  │
  ├─ Check email exists in PostgreSQL
  │
  ├─ Hash password (bcryptjs)
  │
  ├─ Insert user record
  │
  ├─ Generate JWT tokens
  │   ├─ accessToken (15m expiry)
  │   └─ refreshToken (7d expiry)
  │
  ├─ Store refreshToken in DB
  │
  └─ Return { user, accessToken, refreshToken }
```

### Task Creation Flow

```
Client (Authenticated)
  │
  ├─ POST /api/tasks/projects/:id/tasks
  │   Headers: { Authorization: "Bearer TOKEN" }
  │   Body: { title, description, priority }
  │
  ▼ (via Nginx)
  
Task Service
  │
  ├─ Extract token from headers
  │
  ├─ Call Auth Service
  │   GET /api/auth/me (with token)
  │   ← Receives: { id, email, role }
  │
  ├─ Validate project ownership
  │   Check: req.user.id == project.owner_id
  │
  ├─ Create task in MongoDB
  │   {
  │     project_id,
  │     title,
  │     description,
  │     priority,
  │     status: 'todo',
  │     created_by: user.id,
  │     created_at: now()
  │   }
  │
  ├─ (Optional) Notify service
  │   POST /api/notify/internal
  │   { user_id, type: 'task_created', ... }
  │
  └─ Return created task
```

### Authentication Flow (Protected Request)

```
Client
  │
  ├─ GET /api/tasks/projects
  │   Headers: { Authorization: "Bearer ACCESS_TOKEN" }
  │
  ▼ (via Nginx :8080)
  
API Gateway (Nginx)
  │
  ├─ Route to /api/tasks/ upstream
  │
  ▼
  
Task Service:4002
  │
  ├─ Middleware: authenticate
  │
  ├─ Extract token from Authorization header
  │   "Bearer {token}" → {token}
  │
  ├─ Call Auth Service to validate
  │   GET http://auth-service:4001/api/auth/me
  │   Headers: { Authorization: "Bearer TOKEN" }
  │
  ▼
  
Auth Service:4001
  │
  ├─ Verify JWT signature
  │   jwt.verify(token, JWT_SECRET)
  │
  ├─ Check token expiry
  │
  ├─ Return user data or error
  │
  ▼
  
Task Service (continued)
  │
  ├─ If valid: req.user = { id, email, role }
  │
  ├─ Proceed to route handler
  │
  ├─ Query MongoDB
  │
  └─ Return projects where:
     - owner_id == user.id OR
     - user.id in members array
```

### Cross-Service Communication Pattern

```
┌─────────────────────────────────────────────────┐
│ Task Service                                     │
│                                                 │
│ Function: assignTask()                          │
│                                                 │
│ 1. Update task in MongoDB                       │
│    task.assignee_id = newUserId                 │
│                                                 │
│ 2. Notify user of assignment                    │
│    axios.post(                                  │
│      'http://notification-service:4003/       │
│        api/notify/internal',                    │
│      {                                          │
│        user_id: newUserId,                      │
│        type: 'task_assigned',                   │
│        title: 'Task Assigned',                  │
│        message: `You assigned...`,              │
│        data: { task_id, project_id }           │
│      }                                          │
│    )                                            │
│                                                 │
│ 3. Return updated task                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Design Patterns

### 1. Microservice Pattern

**Description:** Breaking down the application into small, independent services

**Benefits:**
- Independent scaling
- Technology flexibility
- Fault isolation
- Parallel development

**Implementation in TaskFlow:**
- Auth Service (authentication)
- Task Service (business logic)
- Notification Service (events)

---

### 2. API Gateway Pattern

**Description:** Single entry point for all client requests

**Benefits:**
- Simplified client logic
- Centralized routing
- CORS handling
- Request/response transformation

**Implementation in TaskFlow:**
- Nginx reverse proxy at port 8080
- Routes to internal services
- Handles CORS headers

---

### 3. JWT Authentication Pattern

**Description:** Stateless authentication using signed tokens

**Benefits:**
- Scalable (no session storage)
- Secure (cryptographically signed)
- Mobile-friendly
- Microservice-friendly

**Implementation in TaskFlow:**
- Access token (15 min) for API calls
- Refresh token (7 days) for token renewal
- Both validated by Auth Service

---

### 4. Database per Service Pattern

**Description:** Each service owns its data and database

**Benefits:**
- Technology choice flexibility
- Data independence
- Easier scaling
- Clear ownership

**Implementation in TaskFlow:**
- Auth Service → PostgreSQL (relational data)
- Task Service → MongoDB (documents)
- Notification Service → MySQL (structured records)

---

### 5. Service-to-Service Communication Pattern

**Description:** Services communicate via HTTP APIs

**Benefits:**
- Decoupled architecture
- Easy debugging
- Standard protocols
- Language-agnostic

**Implementation in TaskFlow:**
- Task Service calls Auth Service to validate tokens
- Task Service calls Notification Service for events
- All via internal HTTP using service names (Docker DNS)

---

## Security Architecture

### Authentication Layer

```
┌─────────────────────────────────────┐
│     Client (Browser/App)             │
│                                      │
│  Login: { email, password }         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      Auth Service                    │
│                                      │
│  1. Receive credentials              │
│  2. Hash submitted password          │
│  3. Compare with stored hash         │
│  4. If match:                        │
│     - Generate JWT tokens           │
│     - Sign with SECRET               │
│     - Set expiry times               │
│  5. Return tokens                    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Client Storage                      │
│                                      │
│  accessToken (localStorage)          │
│  refreshToken (optional)             │
└─────────────────────────────────────┘
```

### Authorization Middleware

```
Request → Check Authorization Header
           "Bearer ACCESS_TOKEN"
                   │
        ┌──────────┴──────────┐
        │                     │
      YES                     NO
        │                     │
   Verify Token          Return 401
   Check Signature       Unauthorized
   Validate Expiry
        │
      Valid?
        │
    ┌───┴────┐
   YES      NO
    │        │
    │      Return 401
    │      Invalid/Expired
    │
Extract User Data
Set req.user
Proceed to Handler
```

### Password Security

**Algorithm:** bcryptjs with 12 salt rounds

```javascript
// When registering:
const salt = 12;  // Higher = slower (more secure)
const hash = await bcrypt.hash(password, salt);
// Store hash in database

// When logging in:
const isValid = await bcrypt.compare(
  submittedPassword,
  storedHash
);
// Compare returns boolean
```

**Benefits:**
- One-way encryption (cannot reverse)
- Salting prevents rainbow table attacks
- Adaptive hashing (slower as computers get faster)

---

## Deployment Architecture

### Local Development

```
Docker Compose
├─ auth-service (Container)
├─ task-service (Container)
├─ notification-service (Container)
├─ frontend (Container)
├─ nginx (Container)
├─ postgres (Container)
├─ mongo (Container)
└─ mysql (Container)

All containers connected via shared network: taskflow
```

### Production (Kubernetes-ready)

```
Each container can be deployed:
- Independently
- On different nodes
- With auto-scaling
- With persistent volumes for databases
- Behind load balancers
```

---

## Summary

The TaskFlow architecture demonstrates:

✅ **Microservice principles** - Independent, scalable services  
✅ **API-first design** - Clear, RESTful interfaces  
✅ **Security best practices** - JWT, password hashing, CORS  
✅ **Data isolation** - Database per service  
✅ **Fault tolerance** - Service failures don't cascade  
✅ **Technology flexibility** - Different DBs and frameworks  
✅ **Developer experience** - Clear separation of concerns  
✅ **Production readiness** - Docker, health checks, error handling  

**Next:** Read [API Reference](./API.md) for detailed endpoint documentation.
