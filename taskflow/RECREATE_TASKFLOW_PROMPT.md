# Recreate TaskFlow Project - Master Prompt

Use this prompt with any AI model to regenerate this exact project.

## Copy-Paste Prompt

```text
You are a senior full-stack architect. Recreate a complete microservice project named "taskflow" exactly as specified below.

Important constraints:
- Generate all source code, config files, Dockerfiles, docker-compose, nginx config, and docs needed to run.
- Stack must match exactly: Node.js + Express microservices, PostgreSQL, MongoDB, MySQL, React (Vite) frontend as the primary dockerized frontend, and an additional Next.js frontend kept in repo.
- Include all API routes and behaviors exactly as described.
- Use the same service names, ports, and compose service names.
- Use JWT auth, and internal service-to-service notification calls.
- Implement in-app notifications in React navbar with unread badge and dropdown.
- Do not skip health checks.
- Ensure `docker compose up -d --build` works from project root.
- Use ESM for Vite React app (`"type": "module"`), and CommonJS for Node services.
- Include built-in mitigation for occasional Nginx stale upstream IPs after container recreation.

Project root name:
- taskflow/

Required top-level structure:
- auth-service/
- task-service/
- notification-service/
- taskflow-react-frontend/
- taskflow-nextjs-frontend/
- nginx/
- scripts/
- docs/
- .env
- docker-compose.yml
- README.md
- QUICKSTART.md
- GETTING_STARTED.md
- PROJECT_SUMMARY.md
- PROJECT_STRUCTURE.md
- TESTS.md

====================================
1) Docker Compose (exact service names)
====================================
Create `docker-compose.yml` with:
- compose project name: `taskflow`
- network: `taskflow` (bridge)
- volumes: `postgres_data`, `mongo_data`, `mysql_data`

Services:
1. `nginx`
- image: nginx:1.25-alpine
- container_name: taskflow-nginx
- port mapping: 8080:80
- depends_on health of: auth-service, task-service, notification-service, frontend
- mounts `./nginx/nginx.conf` as read-only
- healthcheck on `http://localhost/healthz`

2. `auth-service`
- build from `./auth-service/Dockerfile`
- container_name: taskflow-auth
- env:
  - NODE_ENV=${NODE_ENV:-development}
  - PORT=${AUTH_SERVICE_PORT:-4001}
  - DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
  - JWT_SECRET=${JWT_SECRET}
  - JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
- depends_on postgres healthy
- healthcheck: `http://localhost:4001/health`

3. `task-service`
- build from `./task-service/Dockerfile`
- container_name: taskflow-task
- env:
  - NODE_ENV=${NODE_ENV:-development}
  - PORT=${TASK_SERVICE_PORT:-4002}
  - MONGO_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongo:27017/${MONGO_DB}?authSource=admin
  - AUTH_SERVICE_URL=http://auth-service:4001
  - NOTIFICATION_SERVICE_URL=http://notification-service:4003
  - JWT_SECRET=${JWT_SECRET}
- depends_on mongo healthy
- healthcheck: `http://localhost:4002/health`

4. `notification-service`
- build from `./notification-service/Dockerfile`
- container_name: taskflow-notification
- env:
  - NODE_ENV=${NODE_ENV:-development}
  - PORT=${NOTIFICATION_SERVICE_PORT:-4003}
  - MYSQL_HOST=mysql
  - MYSQL_PORT=3306
  - MYSQL_DB=${MYSQL_DB}
  - MYSQL_USER=${MYSQL_USER}
  - MYSQL_PASSWORD=${MYSQL_PASSWORD}
  - JWT_SECRET=${JWT_SECRET}
- depends_on mysql healthy
- healthcheck: `http://localhost:4003/health`

5. `frontend`
- build from `./taskflow-react-frontend/Dockerfile`
- container_name: taskflow-frontend
- env: NODE_ENV=${NODE_ENV:-development}
- healthcheck: `http://localhost:3000`

6. `postgres`
- image: postgres:16-alpine
- container_name: taskflow-postgres
- env: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
- volume: postgres_data
- healthcheck: `pg_isready`

7. `mongo`
- image: mongo:7-jammy
- container_name: taskflow-mongo
- env: root username/password/database from MONGO_* vars
- volume: mongo_data
- healthcheck: ping with mongosh

8. `mysql`
- image: mysql:8-debian
- container_name: taskflow-mysql
- env: MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD
- volume: mysql_data
- healthcheck: mysqladmin ping

====================================
2) Nginx API Gateway
====================================
Create `nginx/nginx.conf` with:
- upstreams:
  - auth_service -> auth-service:4001
  - task_service -> task-service:4002
  - notification_service -> notification-service:4003
  - frontend_app -> frontend:3000
- CORS map allowing `http://localhost:3000` and `http://localhost:8080`
- route forwarding:
  - `/api/auth/` -> auth_service
  - `/api/tasks/` -> task_service
  - `/api/notify/` -> notification_service
  - `/` -> frontend_app
- `/healthz` returns 200 `ok`

Operational requirement:
- Keep classic static `upstream` blocks (auth_service/task_service/notification_service/frontend_app).
- In this environment, Nginx can occasionally hold stale container upstream connections after service recreation.
- Add a recovery script (see Scripts section) that runs `docker compose restart nginx`.
- Document this exact troubleshooting: if any `/api/*` route returns 502 while services are healthy, restart `nginx` first.

====================================
3) Environment Variables (.env)
====================================
Create `.env` exactly with these keys (values can be same defaults):
- COMPOSE_PROJECT_NAME=taskflow
- POSTGRES_HOST=postgres
- POSTGRES_PORT=5432
- POSTGRES_DB=authdb
- POSTGRES_USER=authuser
- POSTGRES_PASSWORD=authpassword
- MONGO_HOST=mongo
- MONGO_PORT=27017
- MONGO_DB=taskdb
- MONGO_USER=taskuser
- MONGO_PASSWORD=taskpassword
- MYSQL_HOST=mysql
- MYSQL_PORT=3306
- MYSQL_DB=notifydb
- MYSQL_USER=notifyuser
- MYSQL_PASSWORD=notifypassword
- MYSQL_ROOT_PASSWORD=rootpassword
- AUTH_SERVICE_PORT=4001
- JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
- JWT_EXPIRES_IN=15m
- TASK_SERVICE_PORT=4002
- NOTIFICATION_SERVICE_PORT=4003
- NODE_ENV=development

====================================
4) Auth Service (Express + PostgreSQL)
====================================
Folder: `auth-service/`

Dependencies:
- bcryptjs ^2.4.3
- cors ^2.8.5
- dotenv ^16.3.1
- express ^4.18.2
- helmet ^7.1.0
- jsonwebtoken ^9.0.2
- pg ^8.11.3
- nodemon ^3.0.2 (dev)

Scripts:
- start: `node src/index.js`
- dev: `nodemon src/index.js`

Implement:
- DB init creating users table and refresh tokens storage if needed
- JWT access/refresh flow
- password hashing with bcrypt
- middleware authenticate JWT
- routes in `src/routes/auth.js`:
  - POST `/register`
  - POST `/login`
  - GET `/me` (auth required)
  - PUT `/me` (auth required)
  - POST `/logout`
- health route: GET `/health` -> `{ "status": "ok" }`

====================================
5) Task Service (Express + MongoDB)
====================================
Folder: `task-service/`

Dependencies:
- axios ^1.6.5
- cors ^2.8.5
- dotenv ^16.3.1
- express ^4.18.2
- mongoose ^8.0.3
- nodemon ^3.0.2 (dev)

Task model fields:
- project_id: ObjectId ref Project (required)
- title: string required
- description: string default ""
- status: enum [todo, in_progress, done], default todo
- priority: enum [low, medium, high], default medium
- assignee_id: string default null
- created_by: string required
- due_date: date nullable
- tags: string[]
- timestamps with `created_at`, `updated_at`

Project model supports ownership and basic CRUD.

Routes in one router (`src/routes/tasks.js`) under `/api/tasks`:
Projects:
- GET `/projects`
- POST `/projects`
- GET `/projects/:id`
- PUT `/projects/:id`
- DELETE `/projects/:id`
Tasks:
- GET `/projects/:id/tasks`
- POST `/projects/:id/tasks`
- GET `/:taskId`
- PUT `/:taskId`
- DELETE `/:taskId`
- PATCH `/:taskId/status`
- POST `/:taskId/assign`

Business rules:
- authenticate all task routes using JWT middleware
- assignment endpoint accepts `{ assignee_id }` (email/string)
- when assigning, call notification service internal endpoint:
  - POST `${NOTIFICATION_SERVICE_URL}/api/notify/internal`
  - body includes `user_id`, `type='task_assigned'`, title/message/data
- when status changes to `done` and assignee exists, create `task_completed` notification
- health route: GET `/health` -> `{ "status": "ok" }`

====================================
6) Notification Service (Express + MySQL)
====================================
Folder: `notification-service/`

Dependencies:
- cors ^2.8.5
- dotenv ^16.3.1
- express ^4.18.2
- jsonwebtoken ^9.0.2
- mysql2 ^3.6.5
- nodemon ^3.0.2 (dev)

Use mysql2/promise pool.

On startup initialize DB with table:
`notifications`
- id INT AUTO_INCREMENT PRIMARY KEY
- user_id VARCHAR(36) NOT NULL
- type ENUM('task_assigned','task_updated','task_completed','project_invite') NOT NULL
- title VARCHAR(255) NOT NULL
- message TEXT NOT NULL
- data JSON
- is_read BOOLEAN DEFAULT FALSE
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- KEY idx_user_id (user_id)
- KEY idx_is_read (user_id, is_read)

Important: define indexes as `KEY ...` in CREATE TABLE (do not use `CREATE INDEX IF NOT EXISTS` syntax that breaks MySQL in this setup).

Routes in `src/routes/notify.js` under `/api/notify`:
Protected (JWT):
- GET `/`
- PATCH `/:id/read`
- PATCH `/read-all`
- DELETE `/:id`
- GET `/unread-count`
Internal (no auth):
- POST `/internal` (create notification)

Return unread count format:
- `{ "unread_count": number }`

Critical identity compatibility rule:
- Assignment currently passes assignee as email in `assignee_id`.
- Notifications may therefore be stored with `user_id = email`, while authenticated user identity may be UUID.
- Read-side notification queries MUST support both user id and email (e.g., `user_id IN (req.user.id, req.user.email)`) for:
  - list notifications
  - unread count
  - mark as read
  - mark all as read
  - delete notification
- This prevents "notification created but not visible" for assigned users.

Health:
- GET `/health` -> `{ "status": "ok" }`

====================================
7) React Frontend (Primary Dockerized UI)
====================================
Folder: `taskflow-react-frontend/`

Tech:
- Vite + React 18 + React Router + Tailwind
- package name `taskflow-frontend`
- package has `"type": "module"`

Dependencies:
- axios ^1.6.7
- react ^18.2.0
- react-dom ^18.2.0
- react-router-dom ^6.22.1

Implement pages/routes:
- `/login`
- `/register`
- `/dashboard`
- `/projects/:projectId`

Core behaviors:
- auth context storing token/user in localStorage
- axios interceptor adds bearer token and handles 401 by redirecting to /login
- dashboard lists projects
- project page lists tasks and supports create, delete, status update, assign by email

Task assignment UI requirements:
- each task card has `Assign` button
- on click, show email input + assign action
- call `POST /api/tasks/:taskId/assign` with `{ assignee_id: email }`
- show loading state `Assigning...`
- show error message on failure
- display assignee using fallback fields:
  - `task.assignee_id || task.assignedTo || task.assignee?.email || task.assignee?.name`

In-app notification UI in Navbar:
- bell icon in top nav
- unread badge count
- dropdown panel listing latest notifications
- mark one as read
- mark all as read
- poll unread count every 10 seconds
- endpoints used:
  - GET `/api/notify/unread-count`
  - GET `/api/notify/`
  - PATCH `/api/notify/:id/read`
  - PATCH `/api/notify/read-all`

Important endpoint note:
- Use trailing slash for notifications list (`/api/notify/`) to avoid 301 redirect edge cases through Nginx.

Use API base URL:
- `http://localhost:8080`

====================================
8) Next.js Frontend (Secondary, keep in repo)
====================================
Folder: `taskflow-nextjs-frontend/`

Tech:
- Next.js 14.2.3 App Router + TypeScript

Include basic pages:
- auth pages (login/register)
- dashboard pages (projects, notifications placeholder)

Keep these corrected path conventions:
- `app/(auth)/...`
- `app/(dashboard)/...`
- `app/api/auth/[...route]/...`
(no backslash-escaped directory names)

Build must pass (`npm run build`).

====================================
9) Dockerfiles
====================================
For each Node service and frontend:
- Use Node 20+ base images
- install deps with npm
- copy source
- expose service port
- run `npm start`

React frontend Dockerfile should run Vite app on port 3000 (or preview/server mode consistent with nginx upstream frontend:3000).

====================================
10) Scripts and Docs
====================================
Create helper scripts:
- `scripts/start.sh` (compose up with build)
- `scripts/verify.sh` (health checks)
- optional `scripts/test-integration.sh`
- `scripts/recover-gateway.sh` (mandatory): restart nginx and print quick API status checks.

`scripts/recover-gateway.sh` behavior:
- run: `docker compose restart nginx`
- then verify:
  - `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/auth/login` (expect 405/400/401, but not 502)
  - `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/tasks/projects` (expect 401 without token, not 502)
  - `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/notify/unread-count` (expect 401 without token, not 502)

Create docs matching this project:
- README and quickstart instructions
- architecture/API/database/deployment/development/troubleshooting docs in `docs/`

====================================
11) Acceptance Criteria (must pass)
====================================
A) `docker compose up -d --build` starts all services healthy.
B) `docker compose config --services` lists:
- postgres
- auth-service
- frontend
- mysql
- notification-service
- mongo
- task-service
- nginx
C) Health endpoints return `{ "status": "ok" }` for auth/task/notification.
D) Full flow works:
- user register/login
- create project
- create task
- assign task to another user email
- assigned user sees unread notification count > 0 in navbar bell
- assigned user can view notification and mark read
E) React and Next.js builds succeed.
F) If auth/tasks/notify via Nginx return 502 after rebuild/recreate, running `scripts/recover-gateway.sh` restores API routing.
G) user1 assigns task to user2 email, and user2 sees unread notification count and list entry.

====================================
12) Output Format
====================================
- Return complete file tree.
- Then provide full content for each file.
- Use exact paths and runnable code.
- Do not provide pseudo-code.

Now generate the complete project.
```

## Notes

- This prompt targets the current project state where the React app is the Dockerized frontend and includes assignment + in-app notification bell UX.
- After generation, run:

```bash
docker compose up -d --build
```

- If you see intermittent `502 Bad Gateway` from `/api/auth/*` or other `/api/*` routes right after container recreation:

```bash
./scripts/recover-gateway.sh
```

- Quick manual fallback:

```bash
docker compose restart nginx
```

- Access app at `http://localhost:8080`.
