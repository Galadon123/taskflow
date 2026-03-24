# TaskFlow - Complete Implementation Guide

This directory contains a fully implemented **TaskFlow** microservice project with complete Docker orchestration, comprehensive documentation, and production-ready code.

## 🚀 START HERE

**New to this project?** Start with one of these guides:

| Guide | Best For | Time |
|-------|----------|------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | **First time?** Overview, quick answers, learning path | 5 min |
| [QUICKSTART.md](./QUICKSTART.md) | **Ready to run?** Step-by-step setup instructions | 5 min |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | **Want details?** Complete feature list & architecture | 10 min |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | **Need file layout?** Directory structure & key files | 5 min |

👉 **Most users should start with [GETTING_STARTED.md](./GETTING_STARTED.md)**

---

## ✅ What's Included

### Backend Services (Node.js + Express)

1. **Auth Service** (`auth-service/`)
   - User registration & login
   - JWT authentication
   - PostgreSQL database
   - Password hashing with bcryptjs

2. **Task Service** (`task-service/`)
   - Project management (CRUD)
   - Task management (CRUD)
   - MongoDB for storage
   - Integration with Auth service for JWT validation

3. **Notification Service** (`notification-service/`)
   - Notification management
   - MySQL database
   - Internal endpoints for other services
   - User notifications tracking

### Frontend Options

1. **React Frontend** (`taskflow-react-frontend/`)
   - Built with Vite
   - React Router for navigation
   - Tailwind CSS styling
   - Authentication context
   - Project & task management UI

2. **Next.js Frontend** (`taskflow-nextjs-frontend/`)
   - Next.js 14 with App Router
   - TypeScript support
   - Server Components & Client Components
   - Tailwind CSS
   - Middleware for route protection

### Infrastructure

- **Docker Compose** - Complete stack orchestration
- **Nginx** - API Gateway and reverse proxy
- **Environment Variables** - Complete `.env` configuration

## � Documentation

Complete documentation is available in the `docs/` directory and root folder:

### Quick Reference (Start Here!)
| Document | Purpose | Read Time |
|----------|---------|-----------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Entry guide with learning path | 5 min |
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute Docker setup guide | 5 min |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Complete project overview & features | 10 min |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | File layout & organization | 5 min |

### Comprehensive Guides
| Document | Purpose | Lines |
|----------|---------|-------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, diagrams, components, data flows | 595 |
| [docs/API.md](./docs/API.md) | Complete API reference with examples | 800+ |
| [docs/DATABASE.md](./docs/DATABASE.md) | Database schemas, indexing, relationships | 650+ |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deployment, scaling, Kubernetes | 700+ |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Local development setup, debugging, testing | 750+ |
| [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | 30+ common issues and solutions | 650+ |
| [docs/INDEX.md](./docs/INDEX.md) | Master reference index | 123 |
| [TESTS.md](./TESTS.md) | Test suite with Jest, unit & integration tests | 700+ |

## �🚀 Quick Start

### 1. Install Docker & Docker Compose

```bash
docker --version
docker compose version
```

### 2. Navigate to the project directory

```bash
cd taskflow
```

### 3. Start all services

```bash
# Quick start with helper script (recommended)
./scripts/start.sh

# Or use docker compose directly
docker compose up -d --build
```

### 4. Verify services are healthy

```bash
./scripts/verify.sh
```

### 5. Access the applications

- **Frontend**: http://localhost:8080
- **API Gateway**: http://localhost:8080/api
- **Auth Service**: http://localhost:4001
- **Task Service**: http://localhost:4002
- **Notification Service**: http://localhost:4003

**➜ For detailed setup guide, see [QUICKSTART.md](./QUICKSTART.md)**

## �️ Helper Scripts

```bash
# Start all services with health checks
./scripts/start.sh

# Verify services are running and healthy
./scripts/verify.sh

# Run integration tests against running containers
./scripts/test-integration.sh
```

## �📊 Database Access

### PostgreSQL (Auth Service)
```bash
docker compose exec postgres psql -U authuser -d authdb
```

### MongoDB (Task Service)
```bash
docker compose exec mongo mongosh -u taskuser -p taskpassword --authenticationDatabase admin
```

### MySQL (Notification Service)
```bash
docker compose exec mysql mysql -u notifyuser -p notifypassword -D notifydb
```

## 🧪 Test Data

### Register a User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Take the `accessToken` and use it in subsequent requests:

```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📁 Project Structure

```
taskflow/
├── auth-service/                # Express + PostgreSQL
├── task-service/                # Express + MongoDB
├── notification-service/        # Express + MySQL
├── taskflow-react-frontend/     # React + Vite
├── taskflow-nextjs-frontend/    # Next.js 14
├── nginx/                       # API Gateway config
├── docker-compose.yml           # Orchestration
├── .env                         # Environment variables
└── README.md                    # This file
```

## 🛠️ Development

### Local Development (Without Docker)

#### Auth Service
```bash
cd auth-service
npm install
npm run dev
```

#### Task Service
```bash
cd task-service
npm install
npm run dev
```

#### Notification Service
```bash
cd notification-service
npm install
npm run dev
```

#### React Frontend
```bash
cd taskflow-react-frontend
npm install
npm run dev
```

#### Next.js Frontend
```bash
cd taskflow-nextjs-frontend
npm install
npm run dev
```

> Note: Ensure all databases (PostgreSQL, MongoDB, MySQL) are running locally

## 🔑 Environment Variables

All environment variables are configured in `.env`:

- `JWT_SECRET` - JWT signing secret (change in production!)
- `POSTGRES_*` - PostgreSQL credentials
- `MONGO_*` - MongoDB credentials
- `MYSQL_*` - MySQL credentials
- Database URLs are automatically constructed from these variables

## 🐛 Troubleshooting

### Services won't start
```bash
# Check service logs
docker compose logs -f auth-service
docker compose logs -f task-service
docker compose logs -f notification-service
```

### Database connection errors
```bash
# Ensure databases are healthy
docker compose ps

# Check database logs
docker compose logs mongo
docker compose logs postgres
docker compose logs mysql
```

### Port conflicts
```bash
# Change the port mapping in docker-compose.yml
# Or run on a different port:
docker compose -p taskflow2 up
```

## 📝 API Endpoints

### Auth Service
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `POST /api/auth/logout` - Logout

### Task Service
- `GET /api/tasks/projects` - List projects
- `POST /api/tasks/projects` - Create project
- `GET /api/tasks/projects/:id/tasks` - List tasks in project
- `POST /api/tasks/projects/:id/tasks` - Create task
- `PATCH /api/tasks/:taskId/status` - Update task status
- `POST /api/tasks/:taskId/assign` - Assign task

### Notification Service
- `GET /api/notify` - Get notifications
- `PATCH /api/notify/:id/read` - Mark as read
- `PATCH /api/notify/read-all` - Mark all as read
- `DELETE /api/notify/:id` - Delete notification

## 🚀 Production Deployment

1. Change `JWT_SECRET` in `.env`
2. Update database passwords
3. Set `NODE_ENV=production`
4. Implement SSL/TLS with Nginx
5. Set up proper logging and monitoring
6. Configure backup strategies for databases

## 📄 License

ISC

---

**Ready to use!** All services are fully implemented and ready for development or deployment. 🎉
