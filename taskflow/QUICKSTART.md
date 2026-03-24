# QUICK START — Docker Compose Setup

This guide will get TaskFlow running with Docker Compose in 5 minutes.

## Prerequisites

- **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** v2.0+ (included with Docker Desktop)
- Minimum 4GB RAM, 2 CPU cores available for Docker
- Ports 8080, 4001-4003, 3000 available

## Quick Start (3 steps)

### Step 1: Clone or Navigate to Project

```bash
cd /home/fazlul-karim/Poridhi/PUKU_EDITOR/docs/sample-projects/taskflow
```

### Step 2: Start All Services

**Option A: Using Startup Script (Recommended)**

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

**Option B: Using Docker Compose Directly**

```bash
docker-compose up -d --build
```

### Step 3: Verify Everything is Running

```bash
docker-compose ps
```

You should see 8 containers:
- ✅ taskflow-postgres
- ✅ taskflow-mongo
- ✅ taskflow-mysql
- ✅ taskflow-auth
- ✅ taskflow-task
- ✅ taskflow-notification
- ✅ taskflow-frontend
- ✅ taskflow-nginx

## Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:8080 | React web interface |
| **API Gateway** | http://localhost:8080/api | API endpoints (through Nginx) |
| **Auth Service** | http://localhost:4001 | User authentication |
| **Task Service** | http://localhost:4002 | Projects & tasks management |
| **Notification Service** | http://localhost:4003 | User notifications |

## Test the APIs

### 1. Register a User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Save the Token

```bash
TOKEN="<accessToken from response>"
```

### 3. Create a Project

```bash
curl -X POST http://localhost:8080/api/tasks/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Project",
    "description": "Testing TaskFlow"
  }'
```

### 4. Create a Task

Replace `<projectId>` with the ID from step 3:

```bash
curl -X POST http://localhost:8080/api/tasks/projects/<projectId>/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature",
    "description": "Build the login page",
    "priority": "high",
    "due_date": "2026-04-01"
  }'
```

### 5. View Notifications

```bash
curl -X GET http://localhost:8080/api/notify \
  -H "Authorization: Bearer $TOKEN"
```

## Using the Web Interface

1. Open http://localhost:8080 in your browser
2. Click "Register" or "Login"
3. Create an account
4. Create projects and tasks from the dashboard
5. Notifications appear in real-time

## Manage Services

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f task-service
docker-compose logs -f notification-service
docker-compose logs -f frontend

# Last 50 lines
docker-compose logs --tail=50
```

### Stop Services

```bash
# Stop but keep containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove containers, and delete volumes (full reset)
docker-compose down -v
```

### Restart Services

```bash
# Restart specific service
docker-compose restart auth-service

# Restart all services
docker-compose restart
```

### Shell Access to Containers

```bash
# Access container shell
docker exec -it taskflow-auth sh
docker exec -it taskflow-task sh
docker exec -it taskflow-notification sh

# Exit: type 'exit' or Ctrl+D
```

### Database Access

```bash
# PostgreSQL shell
docker exec -it taskflow-postgres psql -U authuser -d authdb

# MongoDB shell
docker exec -it taskflow-mongo mongosh -u taskuser -p taskpassword --authenticationDatabase admin

# MySQL shell
docker exec -it taskflow-mysql mysql -u notifyuser -p notifypassword notifydb
```

## Troubleshooting

### Services Won't Start

```bash
# Check if ports are already in use
lsof -i :8080
lsof -i :4001
lsof -i :4002
lsof -i :4003

# Or using netstat
netstat -tuln | grep LISTEN
```

**Solution:** Kill the process or change port in .env

```bash
# Kill process on port 8080 (macOS/Linux)
kill -9 $(lsof -t -i:8080)

# Windows: Change port in docker-compose.yml or .env
```

### Out of Memory / Insufficient Resources

```bash
# Increase Docker Desktop memory limit
# Docker Desktop → Preferences → Resources → Memory

# Or reduce resource usage by stopping unused containers
docker-compose down
```

### Database Connection Issues

```bash
# Check database container health
docker-compose ps

# Restart database services
docker-compose restart postgres mongo mysql

# Check database logs
docker-compose logs postgres
docker-compose logs mongo
docker-compose logs mysql
```

### API Returns 502 Bad Gateway

**Solution:** One of the backend services isn't running

```bash
# Check all service health
docker-compose ps

# View backend service logs
docker-compose logs auth-service task-service notification-service

# Restart all services
docker-compose down && docker-compose up -d --build
```

### Frontend Shows Blank Page

**Solution:** Clear browser cache or check API connection

```bash
# Clear browser cache: Ctrl+Shift+Delete
# Or use incognito/private mode

# Check if API is responding
curl http://localhost:8080/api/auth/me

# Check frontend logs
docker-compose logs frontend
```

## Running Tests

### Using Docker

```bash
# Check Docker container has test database
# Ensure databases are healthy first
docker-compose ps | grep -E "(postgres|mongo|mysql)"

# Run tests in each service
docker exec taskflow-auth npm test
docker exec taskflow-task npm test
docker exec taskflow-notification npm test
```

### Locally (without Docker)

```bash
# Install dependencies
cd auth-service && npm install
cd ../task-service && npm install
cd ../notification-service && npm install

# Create test databases
# (See DEVELOPMENT.md for database setup)

# Run tests
npm test
```

## Environment Configuration

Edit `.env` file to customize:

```bash
# Change JWT secret (required for production)
JWT_SECRET=your-very-long-secret-key-here

# Change database credentials
POSTGRES_PASSWORD=newpassword
MONGO_PASSWORD=newpassword
MYSQL_PASSWORD=newpassword

# Change service ports
AUTH_SERVICE_PORT=4001
TASK_SERVICE_PORT=4002
NOTIFICATION_SERVICE_PORT=4003

# Change Node environment
NODE_ENV=production
```

**⚠️ Important:** Change `JWT_SECRET` before deploying to production!

## Performance Tips

1. **Increase Docker Memory**: Docker Desktop → Preferences → Resources
2. **Use SSD**: Better performance than HDD
3. **Close Unused Apps**: Free up system resources
4. **Monitor Resource Usage**: `docker stats`

## Production Deployment

For production deployment, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

Key changes:
- Change NODE_ENV to 'production'
- Set strong JWT_SECRET
- Use SSL/TLS certificates
- Configure proper domain names
- Set resource limits
- Enable persistent backups

## Next Steps

- 📖 Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design
- 🔌 Check [API.md](./docs/API.md) for complete API reference
- 🗃️ See [DATABASE.md](./docs/DATABASE.md) for database schemas
- 🧪 Review [TESTS.md](./TESTS.md) for testing
- 🔧 Follow [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for local setup
- 🆘 Consult [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for issues

## Support

If you encounter issues:

1. Check logs: `docker-compose logs`
2. Verify ports: `lsof -i :8080`
3. Check Docker: `docker version`
4. See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
5. Open GitHub issue with logs

---

**Happy coding! 🚀**
