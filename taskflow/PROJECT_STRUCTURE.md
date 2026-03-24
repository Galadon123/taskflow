# 📁 TaskFlow Project Structure

Complete directory layout showing all files and their purposes.

```
taskflow/
│
├── 📄 Project Files (Top Level)
│   ├── README.md                      # Project overview & quick start
│   ├── QUICKSTART.md                  # ⭐ START HERE - 5-minute setup
│   ├── PROJECT_SUMMARY.md             # Comprehensive project summary
│   ├── TESTS.md                       # Test suite documentation
│   ├── docker-compose.yml             # Docker orchestration (8 services)
│   ├── .env.example                   # Environment variables template
│   └── .env                           # Actual environment config
│
├── 📂 docs/ - Documentation (4000+ lines)
│   ├── INDEX.md                       # Master reference document
│   ├── QUICKSTART.md                  # Emergency quick reference
│   ├── ARCHITECTURE.md                # System design & diagrams
│   ├── API.md                         # Complete API reference
│   ├── DATABASE.md                    # Schema definitions
│   ├── DEPLOYMENT.md                  # Production deployment
│   ├── DEVELOPMENT.md                 # Local development guide
│   └── TROUBLESHOOTING.md             # 30+ common issues & solutions
│
├── 📂 scripts/ - Helper Automation
│   ├── start.sh                       # 🚀 Start all services (150 lines)
│   ├── verify.sh                      # ✅ Verify health (180 lines)
│   └── test-integration.sh            # 🧪 Run integration tests (200 lines)
│
├── 📂 auth-service/ - User Authentication
│   ├── Dockerfile                     # Node.js 22 Alpine build
│   ├── package.json                   # Express, JWT, bcryptjs
│   ├── .env                           # Database config
│   ├── src/
│   │   ├── index.js                   # Express server, routes
│   │   ├── middleware/
│   │   │   └── auth.js                # JWT verification middleware
│   │   ├── routes/
│   │   │   └── auth.js                # /register, /login, /me, /logout
│   │   ├── models/
│   │   │   └── User.js                # PostgreSQL user schema
│   │   └── db.js                      # PostgreSQL connection
│   └── __tests__/
│       └── auth.test.js               # Jest test cases
│
├── 📂 task-service/ - Project & Task Management
│   ├── Dockerfile                     # Node.js 22 Alpine build
│   ├── package.json                   # Express, Mongoose
│   ├── .env                           # Database & service config
│   ├── src/
│   │   ├── index.js                   # Express server, routes
│   │   ├── middleware/
│   │   │   └── auth.js                # Auth service verification
│   │   ├── routes/
│   │   │   ├── projects.js            # /projects CRUD
│   │   │   └── tasks.js               # /tasks CRUD
│   │   ├── models/
│   │   │   ├── Project.js             # MongoDB project schema
│   │   │   └── Task.js                # MongoDB task schema
│   │   ├── db.js                      # MongoDB connection
│   │   └── services/
│   │       └── notificationService.js # API calls to notification service
│   └── __tests__/
│       └── tasks.test.js              # Jest test cases
│
├── 📂 notification-service/ - User Notifications
│   ├── Dockerfile                     # Node.js 22 Alpine build
│   ├── package.json                   # Express, mysql2
│   ├── .env                           # Database config
│   ├── src/
│   │   ├── index.js                   # Express server, routes
│   │   ├── middleware/
│   │   │   └── auth.js                # Auth service verification
│   │   ├── routes/
│   │   │   └── notifications.js       # /notifications endpoints
│   │   ├── models/
│   │   │   ├── schema.sql             # MySQL schema (run on init)
│   │   │   └── Notification.js        # Query builder
│   │   └── db.js                      # MySQL connection & pool
│   └── __tests__/
│       └── notifications.test.js      # Jest test cases
│
├── 📂 taskflow-react-frontend/ - React + Vite Frontend
│   ├── Dockerfile                     # Multi-stage build
│   ├── package.json                   # React, Vite, Tailwind
│   ├── vite.config.js                 # Vite configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── .env                           # API base URL config
│   ├── index.html                     # HTML entry point
│   └── src/
│       ├── main.jsx                   # React app entry
│       ├── App.jsx                    # Root component
│       ├── pages/
│       │   ├── Login.jsx              # Login page
│       │   ├── Register.jsx           # Registration page
│       │   ├── Dashboard.jsx          # Project listing
│       │   └── ProjectDetail.jsx      # Task management
│       ├── components/
│       │   ├── Header.jsx             # Navigation header
│       │   ├── Sidebar.jsx            # Project sidebar
│       │   ├── TaskModal.jsx          # Create/edit task modal
│       │   └── ProjectCard.jsx        # Project display card
│       ├── context/
│       │   └── AuthContext.jsx        # Authentication state
│       ├── services/
│       │   └── api.js                 # Axios API client
│       └── styles/
│           └── index.css              # Global styles
│
├── 📂 taskflow-nextjs-frontend/ - Next.js TypeScript Frontend
│   ├── Dockerfile                     # Multi-stage build
│   ├── package.json                   # Next.js, TypeScript, Tailwind
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.ts             # Tailwind CSS config
│   ├── .env.local                     # Environment variables
│   ├── .env.production                # Production environment
│   ├── next-env.d.ts                  # TypeScript definitions
│   ├── middleware.ts                  # Auth middleware (redirects)
│   └── app/
│       ├── layout.tsx                 # Root layout
│       ├── page.tsx                   # Home page
│       ├── (auth)/
│       │   ├── login/page.tsx         # Login page
│       │   ├── register/page.tsx      # Registration page
│       │   └── layout.tsx             # Auth layout
│       ├── (dashboard)/
│       │   ├── dashboard/page.tsx     # Projects list
│       │   ├── project/[id]/page.tsx  # Project details
│       │   └── layout.tsx             # Dashboard layout
│       ├── api/
│       │   └── auth/
│       │       ├── login/route.ts     # API endpoint
│       │       └── logout/route.ts    # API endpoint
│       └── components/
│           ├── Navbar.tsx             # Navigation component
│           ├── Sidebar.tsx            # Sidebar component
│           └── TaskCard.tsx           # Task display card
│
├── 📂 nginx/ - API Gateway
│   └── nginx.conf                     # Nginx reverse proxy configuration
│                                      # - Routes: /api/auth → :4001
│                                      # - Routes: /api/tasks → :4002
│                                      # - Routes: /api/notify → :4003
│                                      # - Routes: / → React/Next frontend
│                                      # - Health checks on upstreams
│                                      # - CORS headers
│                                      # - Gzip compression
│
├── 📂 .github/ - CI/CD Configuration
│   └── workflows/
│       └── test.yml                   # GitHub Actions workflow
│                                      # - Runs on push/PR
│                                      # - Spins up Docker services
│                                      # - Runs Jest tests
│
└── 📂 Database Initialization Scripts
    ├── init-postgres.sql              # PostgreSQL schema for auth
    ├── init-mongodb.js                # MongoDB collections for tasks
    └── init-mysql.sql                 # MySQL schema for notifications
```

---

## 📊 Quick Statistics

```
Total Files:          ~65 files
Total Lines of Code:  ~11,700 lines
Documentation:        ~5,000 lines (8 markdown files)
Source Code:          ~6,000 lines (20+ service files)
Tests:                ~500 lines (Jest test suites)
Configuration:        ~200 lines (Docker, nginx, env)

Services:             3 (Auth, Task, Notification)
Frontends:            2 (React + Next.js)
Databases:            3 (PostgreSQL, MongoDB, MySQL)
Docker Containers:    8 (3 DBs + 3 services + 2 frontends + nginx)
Helper Scripts:       3 (start, verify, test)
```

---

## 📖 Documentation Map

```
START HERE
    │
    ├─→ QUICKSTART.md (5 min setup)
    │    └─→ DEVELOPMENT.md (local setup details)
    │        └─→ TROUBLESHOOTING.md (if issues)
    │
    ├─→ PROJECT_SUMMARY.md (this layout)
    │
    └─→ docs/
         ├─→ INDEX.md (master reference)
         ├─→ ARCHITECTURE.md (system design)
         ├─→ API.md (endpoints & examples)
         ├─→ DATABASE.md (schemas & queries)
         ├─→ DEPLOYMENT.md (production setup)
         ├─→ DEVELOPMENT.md (dev environment)
         ├─→ TROUBLESHOOTING.md (issue resolution)
         └─→ TESTS.md (test suite docs)
```

---

## 🚀 Essential Commands

### First Time Setup

```bash
cd /path/to/taskflow

# Make scripts executable
chmod +x scripts/*.sh

# Start everything
./scripts/start.sh

# Verify all services  
./scripts/verify.sh

# Run tests
./scripts/test-integration.sh
```

### Daily Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service]

# Run tests
npm test                    # In service directory
./scripts/test-integration.sh  # Full integration tests

# Stop services
docker-compose down
```

### Access Points

```
Frontend:        http://localhost:8080
API Gateway:     http://localhost:8080/api

Direct Access (internal):
- Auth Service:        http://localhost:4001
- Task Service:        http://localhost:4002
- Notification Service: http://localhost:4003

Database Access:
- PostgreSQL:   localhost:5432 (user: authuser)
- MongoDB:      localhost:27017
- MySQL:        localhost:3306 (user: notifyuser)
```

---

## 🔗 Key File Relationships

### Authentication Flow
```
Frontend (React/Next)
    ↓ (POST /register, /login)
Nginx Gateway (Port 8080)
    ↓
Auth Service (Port 4001)
    ↓ (queries)
PostgreSQL Database (Port 5432)
    ↓ (returns JWT token)
Frontend (stores in localStorage)
    ↓ (includes in all API calls)
```

### Task Management Flow
```
Frontend (React/Next)
    ↓ (POST /api/tasks with JWT)
Nginx Gateway
    ↓
Task Service (Port 4002)
    ├─ Verifies JWT with Auth Service
    ├─ Creates task in MongoDB
    └─ Notifies Notification Service
        ↓
Notification Service (Port 4003)
    ↓ Creates record in MySQL
```

### Service Communication
```
Auth Service  ←  (validates tokens)  ← All other services
Task Service  ←  (notifies)          ← Notification Service
Frontend      ←  (calls)             ← All services via Nginx
```

---

## 📝 Common File Updates

### Adding New API Endpoint

```
1. Create route handler:
   task-service/src/routes/tasks.js → add GET /tasks/:id

2. Add business logic:
   task-service/src/models/Task.js → add query method

3. Add tests:
   task-service/__tests__/tasks.test.js → add test case

4. Update documentation:
   docs/API.md → add endpoint documentation

5. Test:
   ./scripts/test-integration.sh
```

### Updating Database Schema

```
1. Update model:
   task-service/src/models/Task.js → add new field

2. Create migration (if needed):
   scripts/migrations/add-field.js

3. Update schema documentation:
   docs/DATABASE.md → document new field

4. Update API documentation:
   docs/API.md → if field is exposed in API
```

### Adding Frontend Feature

```
1. Create component:
   taskflow-react-frontend/src/components/NewFeature.jsx

2. Add to page:
   taskflow-react-frontend/src/pages/Dashboard.jsx → import & use

3. Integrate API:
   taskflow-react-frontend/src/services/api.js → add API call

4. Update in Next.js too:
   taskflow-nextjs-frontend/app/(dashboard)/...
```

---

## ✅ Verification Checklist

Before running in production, verify:

- [ ] All environment variables set in `.env`
- [ ] PostgreSQL, MongoDB, MySQL accessible
- [ ] Docker Compose version 2+
- [ ] Ports 8080, 4001-4003, 5432, 27017, 3306 available
- [ ] `./scripts/start.sh` completes successfully
- [ ] `./scripts/verify.sh` shows all services healthy
- [ ] `./scripts/test-integration.sh` passes all tests
- [ ] Frontend accessible at http://localhost:8080
- [ ] Can register and login
- [ ] Can create projects and tasks
- [ ] Can view notifications

---

## 🎯 Next Steps

1. **Read QUICKSTART.md** (5 minutes)
2. **Run `./scripts/start.sh`** (3 minutes)
3. **Access http://localhost:8080** (test frontend)
4. **Read docs/ARCHITECTURE.md** (understand system)
5. **Run `./scripts/test-integration.sh`** (verify APIs)
6. **Read docs/DEVELOPMENT.md** (start development)

---

**Everything is ready! Start with QUICKSTART.md** 🚀
