# TaskFlow - Complete Technical Documentation

Welcome to the TaskFlow microservice documentation. This document provides an overview of the entire project structure and components.

## 📚 Documentation Index

1. **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design, components, and interactions
2. **[API Reference](./docs/API.md)** - Complete API endpoint documentation
3. **[Database Schemas](./docs/DATABASE.md)** - Data models and schema definitions
4. **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions
5. **[Development Guide](./docs/DEVELOPMENT.md)** - Local development setup
6. **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🎯 Project Overview

**TaskFlow** is a complete, production-ready microservice application for project and task management. It demonstrates industry best practices for:

- ✅ Microservice architecture with independent services
- ✅ JWT authentication and authorization
- ✅ Multi-database approach (PostgreSQL, MongoDB, MySQL)
- ✅ API Gateway pattern with Nginx
- ✅ Docker containerization
- ✅ React and Next.js frontend options
- ✅ Comprehensive error handling
- ✅ CORS and security headers

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend Layer                     │
│  React/Vite or Next.js 14 (Port 3000)      │
└──────────────────┬──────────────────────────┘
                   │ HTTP
                   ▼
┌─────────────────────────────────────────────┐
│        API Gateway (Nginx:8080)             │
│  ├─ /api/auth → Auth Service               │
│  ├─ /api/tasks → Task Service              │
│  └─ /api/notify → Notification Service     │
└──────────┬─────────────┬─────────────┬──────┘
           │             │             │
           ▼             ▼             ▼
    ┌─────────────┐┌──────────┐┌──────────────┐
    │Auth Service ││Task      ││Notification │
    │:4001        ││Service   ││Service:4003  │
    │Express      ││:4002     ││Express       │
    │+ JWT        ││Express   ││+ WebSocket   │
    │+ bcryptjs   ││+ Mongoose││+ MySQL       │
    └─────┬───────┘└────┬─────┘└──────┬───────┘
          │             │             │
          ▼             ▼             ▼
    ┌─────────────┐┌──────────┐┌──────────────┐
    │PostgreSQL   ││MongoDB   ││MySQL         │
    │auth_db      ││taskdb    ││notifydb      │
    │ - users     ││ - projects││ - notifications
    │ - tokens    ││ - tasks   ││              │
    └─────────────┘└──────────┘└──────────────┘
```

## 🚀 Quick Start

```bash
# 1. Clone or navigate to the project
cd taskflow

# 2. Start all services with Docker
docker compose up --build

# 3. Access the application
Open http://localhost:8080 in your browser
```

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite / Next.js 14 | User interface with modern tooling |
| **API Gateway** | Nginx 1.25 | Request routing, CORS, SSL termination |
| **Auth Service** | Node.js 22 + Express | User authentication, JWT tokens |
| **Task Service** | Node.js 22 + Express | Project & task management |
| **Notify Service** | Node.js 22 + Express | Notification system |
| **Auth DB** | PostgreSQL 16 | User & token storage |
| **Task DB** | MongoDB 7 | Project & task documents |
| **Notify DB** | MySQL 8 | Notification records |
| **Runtime** | Docker + Compose | Containerization & orchestration |

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs with salt rounds
- **CORS Headers** - Controlled cross-origin requests
- **Security Headers** - Helmet.js protection
- **httpOnly Cookies** - Secure token storage (Next.js)
- **Input Validation** - Request body validation
- **Authorization Middleware** - Token verification on protected routes

## 📈 Scalability Considerations

The microservice architecture allows for:

1. **Independent Scaling** - Scale services based on load
2. **Technology Flexibility** - Replace services without affecting others
3. **Database Optimization** - Specialized DBs for each service
4. **Load Balancing** - Nginx can distribute traffic
5. **Containerization** - Kubernetes-ready deployment

## 🔗 Service Communication

```
Services communicate via:
- HTTP REST APIs for synchronous operations
- Internal service URLs (within Docker network)
- JWT tokens for cross-service authentication
- Axios HTTP client for service-to-service calls
```

## 📝 Documentation Structure

Each documentation file includes:
- Detailed explanations
- Code examples
- Mermaid diagrams
- CLI commands
- Best practices
- Common patterns

## 🤝 Contributing

When adding new features:

1. Update relevant API documentation
2. Add database migrations if schema changes
3. Update deployment guide if infrastructure changes
4. Test with Docker Compose
5. Update this index if adding new documentation

## 📞 Support

For issues, refer to:
1. [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) - Common problems and solutions
2. Service logs: `docker compose logs -f SERVICE_NAME`
3. Health checks: `http://localhost:SERVICE_PORT/health`

---

**Next:** Start with the [Architecture Overview](./docs/ARCHITECTURE.md) for a detailed understanding of the system design.
