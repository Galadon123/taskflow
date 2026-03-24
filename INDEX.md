# 📚 Poku Editor - Sample Projects Index

Welcome to the Poku Editor Sample Projects! This directory contains production-ready example projects demonstrating best practices for various technology stacks.

---

## 🎯 Projects Overview

### 1. **TaskFlow** - Full-Stack Microservices ⭐ (Recommended)
**Status:** Production Ready | **Complexity:** Advanced | **Time to Run:** ~5 min

A complete microservices project with everything you need to understand modern application architecture.

**What's Included:**
- ✅ 3 Node.js microservices (Auth, Task, Notification)
- ✅ 2 frontend options (React + Next.js)
- ✅ 3 databases (PostgreSQL, MongoDB, MySQL)
- ✅ Full Docker Compose orchestration
- ✅ Comprehensive documentation (4000+ lines)
- ✅ Complete test suite with Jest
- ✅ Helper scripts (start, verify, test)

**Getting Started:**
```bash
cd taskflow
./scripts/start.sh              # Start everything (3 min)
open http://localhost:8080      # Visit frontend
./scripts/verify.sh             # Check health
./scripts/test-integration.sh   # Run tests
```

**Key Files:**
- [GETTING_STARTED.md](./taskflow/GETTING_STARTED.md) - Entry guide
- [QUICKSTART.md](./taskflow/QUICKSTART.md) - 5-minute setup
- [PROJECT_SUMMARY.md](./taskflow/PROJECT_SUMMARY.md) - Feature overview
- [docs/ARCHITECTURE.md](./taskflow/docs/ARCHITECTURE.md) - System design

**Learn About:**
- Microservices architecture
- Docker & Docker Compose
- API design with Express.js
- Multiple database patterns
- Frontend integration
- Testing strategies
- Deployment patterns

---

## 📦 Other Sample Projects

### 2. **Node.js Microservice** - Backend API Service
**Status:** Reference Example | **Complexity:** Intermediate

A typical Node.js backend microservice example.

**Topics:**
- Express.js server setup
- Database integration
- API endpoint design
- Error handling
- Middleware patterns

**File:** [nodejs-microservice.md](./nodejs-microservice.md)

---

### 3. **Python Microservice** - Python Backend
**Status:** Reference Example | **Complexity:** Intermediate

Example of a Python-based microservice.

**Topics:**
- Python web frameworks
- Database integration
- API design patterns
- Python best practices

**File:** [python-microservice.md](./python-microservice.md)

---

### 4. **Golang Microservice** - Go Backend
**Status:** Reference Example | **Complexity:** Intermediate

Golang microservice example for high-performance services.

**Topics:**
- Go server setup
- Concurrency patterns
- Database connections
- API development
- Deployment considerations

**File:** [golang-microservice.md](./golang-microservice.md)

---

### 5. **React Frontend** - Modern React App
**Status:** Reference Example | **Complexity:** Intermediate

React application best practices and patterns.

**Topics:**
- React component structure
- State management
- API integration
- Routing
- CSS-in-JS solutions
- Testing React components

**File:** [react-frontend.md](./react-frontend.md)

---

### 6. **Next.js Frontend** - Full-Stack Framework
**Status:** Reference Example | **Complexity:** Intermediate

Next.js application example with server-side rendering.

**Topics:**
- Next.js App Router
- Server Components
- API Routes
- Middleware
- Deployment
- Performance optimizations

**File:** [nextjs-frontend.md](./nextjs-frontend.md)

---

### 7. **Docker Setup** - Containerization Guide
**Status:** Reference Guide | **Complexity:** Beginner

Guide to Docker and containerization concepts.

**Topics:**
- Docker fundamentals
- Dockerfile creation
- Multi-stage builds
- Docker Compose
- Container networking
- Volume management

**File:** [docker-setup.md](./docker-setup.md)

---

### 8. **Overview** - Project Guide
**Status:** Getting Started | **Complexity:** Beginner

General overview and guide to all sample projects.

**File:** [overview.md](./overview.md)

---

## 🚀 Quick Start Guide

### For Learning Microservices (Recommended)

**Start with TaskFlow:**

Days 1-2: Run TaskFlow and explore
```bash
cd taskflow
./scripts/start.sh
# Explore http://localhost:8080
# Read GETTING_STARTED.md
```

Days 3-4: Read architecture & understand design
```bash
# Read docs/ARCHITECTURE.md
# Read docs/API.md
# Run ./scripts/test-integration.sh
```

Days 5+: Develop features
```bash
# Read docs/DEVELOPMENT.md
# Make code changes
# Run tests
```

---

### For Learning a Specific Backend

1. **Node.js** → [nodejs-microservice.md](./nodejs-microservice.md)
2. **Python** → [python-microservice.md](./python-microservice.md)
3. **Golang** → [golang-microservice.md](./golang-microservice.md)

---

### For Learning Frontend Development

1. **React** → [react-frontend.md](./react-frontend.md)
2. **Next.js** → [nextjs-frontend.md](./nextjs-frontend.md)
3. **Or Try Both** → TaskFlow has both included!

---

### For Learning Docker

1. Start here → [docker-setup.md](./docker-setup.md)
2. Then explore → TaskFlow's docker-compose.yml
3. Practice → Use TaskFlow's helper scripts

---

## 📊 Compare Projects

| Feature | TaskFlow | Node.js | Python | Golang | React | Next.js |
|---------|----------|---------|--------|--------|-------|---------|
| **Runtime** | Node.js | Node.js | Python | Go | React | Next.js |
| **Databases** | 3 types | Configurable | Configurable | Configurable | N/A | N/A |
| **Docker** | ✅ Compose | Included | Included | Included | ✅ Build | ✅ Build |
| **Frontend** | 2 options | N/A | N/A | N/A | ✅ Full | ✅ Full |
| **Testing** | ✅ Complete | Basic | Basic | Basic | Basic | Basic |
| **Docs** | 4000+ lines | Reference | Reference | Reference | Reference | Reference |
| **Complexity** | Advanced | Intermediate | Intermediate | Intermediate | Intermediate | Intermediate |
| **Time to Run** | 5 min | 5 min | 5 min | 5 min | 5 min | 5 min |

---

## 🎓 Learning Paths

### Path 1: Full-Stack Developer (8-12 hours)
```
1. Read: overview.md
2. Run: TaskFlow → ./scripts/start.sh
3. Read: taskflow/GETTING_STARTED.md
4. Explore: TaskFlow architecture
5. Read: docker-setup.md
6. Read: taskflow/docs/ARCHITECTURE.md
7. Read: react-frontend.md + nextjs-frontend.md
8. Read: nodejs-microservice.md
9. Customize: TaskFlow for your needs
```

### Path 2: Backend Developer (6-10 hours)
```
1. Read: overview.md
2. Read: nodejs-microservice.md
3. Read: python-microservice.md
4. Read: golang-microservice.md
5. Run: TaskFlow backend services
6. Read: taskflow/docs/API.md
7. Read: taskflow/docs/DATABASE.md
8. Experiment: Modify backend services
```

### Path 3: Frontend Developer (4-8 hours)
```
1. Read: overview.md
2. Read: react-frontend.md
3. Read: nextjs-frontend.md
4. Run: TaskFlow frontend options
5. Read: taskflow/docs/ARCHITECTURE.md
6. Experiment: Modify frontend components
```

### Path 4: DevOps/Infrastructure (6-10 hours)
```
1. Read: docker-setup.md
2. Read: overview.md
3. Run: TaskFlow with ./scripts/start.sh
4. Read: taskflow/docs/DEPLOYMENT.md
5. Read: taskflow/docker-compose.yml (detailed)
6. Experiment: Modify docker-compose.yml
7. Read: taskflow/docs/DEVELOPMENT.md
```

---

## 📚 Documentation Standards

All projects follow consistent documentation standards:

### Quick Start (Every Project)
- ✅ Step-by-step setup
- ✅ All commands provided
- ✅ Expected output shown
- ✅ Troubleshooting tips

### Architecture Documentation
- ✅ System diagrams
- ✅ Component descriptions
- ✅ Data flow explanations
- ✅ Technology choices justified

### API/Endpoint Documentation
- ✅ All endpoints listed
- ✅ Request/response examples
- ✅ Error codes explained
- ✅ Usage examples provided

### Deployment Guide
- ✅ Environment setup
- ✅ Deployment steps
- ✅ Scaling considerations
- ✅ Monitoring setup

---

## 🆘 Common Questions

**Q: Which project should I start with?**  
A: TaskFlow! It covers everything in one integrated project.

**Q: Can I run multiple projects?**  
A: Yes, but they may use the same ports. Check individual documentation.

**Q: Are these production-ready?**  
A: TaskFlow is production-ready with caveats (SSL, monitoring). Others are reference examples.

**Q: Can I use parts of TaskFlow in my project?**  
A: Absolutely! TaskFlow is modular - use services, patterns, or configs as needed.

**Q: How often are these updated?**  
A: With new best practices. Check documentation for latest versions.

**Q: What if I find bugs?**  
A: Report them with detailed reproduction steps. These are reference implementations.

---

## 🔗 File Organization

```
sample-projects/
├── INDEX.md                        ← YOU ARE HERE
├── overview.md                     # Project overview
├── docker-setup.md                 # Docker guide
├── nodejs-microservice.md          # Node.js reference
├── python-microservice.md          # Python reference
├── golang-microservice.md          # Go reference
├── react-frontend.md               # React reference
├── nextjs-frontend.md              # Next.js reference
└── taskflow/                       # ⭐ MAIN PROJECT
    ├── GETTING_STARTED.md          # Entry guide
    ├── QUICKSTART.md               # 5-min setup
    ├── PROJECT_SUMMARY.md          # Feature list
    ├── PROJECT_STRUCTURE.md        # File layout
    ├── README.md                   # Project readme
    ├── TESTS.md                    # Test suite
    ├── docker-compose.yml          # Orchestration
    ├── .env                        # Configuration
    ├── scripts/                    # Helper scripts
    ├── auth-service/               # Service 1
    ├── task-service/               # Service 2
    ├── notification-service/       # Service 3
    ├── taskflow-react-frontend/    # Frontend option 1
    ├── taskflow-nextjs-frontend/   # Frontend option 2
    ├── nginx/                      # API gateway
    └── docs/                       # Complete docs
```

---

## ✨ Key Features Across Projects

### TaskFlow Highlights
- **Completeness**: Everything you need in one project
- **Education**: Learn entire system architecture
- **Production**: Ready to customize and deploy
- **Testing**: Complete test suite included
- **Documentation**: 4000+ lines covering everything
- **Automation**: Helper scripts included

### Other Projects Highlights
- **Reference**: Clear, focused examples
- **Modular**: Easy to copy patterns
- **Documented**: Detailed explanations
- **Best Practices**: Following industry standards
- **Extensible**: Easy to modify and extend

---

## 🎯 Next Steps

### 1. **First Time Here?**
Start with [GETTING_STARTED.md](./taskflow/GETTING_STARTED.md)

### 2. **Want to Run Something?**
Go to TaskFlow: [QUICKSTART.md](./taskflow/QUICKSTART.md)

### 3. **Looking for Specific Tech?**
- React: [react-frontend.md](./react-frontend.md)
- Next.js: [nextjs-frontend.md](./nextjs-frontend.md)
- Node.js: [nodejs-microservice.md](./nodejs-microservice.md)
- Python: [python-microservice.md](./python-microservice.md)
- Go: [golang-microservice.md](./golang-microservice.md)
- Docker: [docker-setup.md](./docker-setup.md)

### 4. **Want Full Project?**
Explore TaskFlow: [PROJECT_SUMMARY.md](./taskflow/PROJECT_SUMMARY.md)

---

## 📞 Support

Each project has its own documentation. When you run a project:

1. Check the `QUICKSTART.md` or `README.md`
2. Review project-specific docs (usually in `docs/` folder)
3. Check troubleshooting guides
4. Review example files and code comments

---

## 🎉 Happy Learning!

Pick a project that matches your learning goals and dive in. All projects are designed to be:
- ✅ Easy to understand
- ✅ Quick to run
- ✅ Fun to explore
- ✅ Safe to modify

**Recommended: Start with TaskFlow → Run it → Read the docs → Customize it!**

Good luck! 🚀
