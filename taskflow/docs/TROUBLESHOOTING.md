# TROUBLESHOOTING GUIDE — Common Issues & Solutions

This guide covers common problems encountered during development, testing, and deployment of TaskFlow, with step-by-step solutions.

## Table of Contents

1. [Port & Connection Issues](#port--connection-issues)
2. [Database Connection Errors](#database-connection-errors)
3. [Authentication & Token Issues](#authentication--token-issues)
4. [Service Communication Problems](#service-communication-problems)
5. [Docker & Container Issues](#docker--container-issues)
6. [Frontend Issues](#frontend-issues)
7. [Performance & Timeout Issues](#performance--timeout-issues)
8. [Log Analysis & Debugging](#log-analysis--debugging)
9. [Data & Migration Issues](#data--migration-issues)
10. [Email/Notification Issues](#emailnotification-issues)

---

## Port & Connection Issues

### Problem: Port Already in Use

**Symptom:** `Error: listen EADDRINUSE :::4001`

**Solution:**

```bash
# Find process using port
lsof -i :4001              # macOS/Linux
netstat -ano | findstr :4001  # Windows

# Kill process
kill -9 <PID>              # macOS/Linux
taskkill /PID <PID> /F     # Windows

# Or change service port in .env
PORT=4011
```

**Prevention:**
- Use different ports for dev/test: 4001, 4002, 4003 for prod; 5001, 5002, 5003 for dev
- Document port assignments

---

### Problem: Connection Refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

```bash
# Verify service is running
ps aux | grep postgres    # Check if postgres running
netstat -an | grep 5432   # Check if port listening

# Restart database
# PostgreSQL
brew services restart postgresql  # macOS
sudo service postgresql restart   # Linux

# MongoDB
brew services restart mongodb-community  # macOS
mongod --dbpath /data/db &               # Or start manually

# MySQL
brew services restart mysql       # macOS
sudo service mysql restart        # Linux
```

**Check logs:**
```bash
# PostgreSQL logs
tail -f /usr/local/var/log/postgres.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log

# MySQL logs
tail -f /var/log/mysql/error.log
```

---

### Problem: Timeout Connecting to Service

**Symptom:** `Error: Timeout after 30000ms waiting for operation`

**Solution:**

```bash
# Increase connection timeout
// .env
MONGO_URI=mongodb://user:pass@localhost/db?connectTimeoutMS=60000

// Code
const mongoose = require('mongoose');
mongoose.connect(mongoUri, {
  connectTimeoutMS: 60000,
  serverSelectionTimeoutMS: 60000
});
```

**Check service health:**
```bash
# Test connection manually
psql -h localhost -U postgres -d taskflow_auth_dev
mongo --host localhost --port 27017
mysql -h localhost -u root
```

---

## Database Connection Errors

### Problem: PostgreSQL Connection String Invalid

**Symptom:** `Error: connect ECONNREFUSED` or `FATAL: database "xyz" does not exist`

**Solution:**

```bash
# Verify connection string format
# postgresql://user:password@host:port/database
# Example:
postgresql://postgres:postgres@localhost:5432/taskflow_auth_dev

# Test connection
psql postgresql://postgres:postgres@localhost:5432/taskflow_auth_dev -c "SELECT 1"

# Check .env file
grep DB_ .env.local

# Ensure database exists
createdb -U postgres taskflow_auth_dev

# Check user permissions
psql -U postgres -c "\du"
```

---

### Problem: MongoDB Authentication Failed

**Symptom:** `MongoAuthenticationError: authentication failed`

**Solution:**

```bash
# Verify MongoDB user exists
mongo admin -u admin -p --eval "db.getUsers()"

# Create user if missing
mongo admin << EOF
db.createUser({
  user: "taskflow",
  pwd: "taskflow",
  roles: ["readWrite", "dbAdmin", "userAdmin"]
})
EOF

# Update connection string
# Include authSource for authentication database
mongodb://taskflow:taskflow@localhost:27017/taskflow_tasks_dev?authSource=admin

# Test connection
mongo mongodb://taskflow:taskflow@localhost:27017/taskflow_tasks_dev?authSource=admin
```

---

### Problem: MySQL Access Denied

**Symptom:** `Error: Access denied for user 'root'@'localhost' (using password: YES)`

**Solution:**

```bash
# Connect without password if first time
mysql -u root

# Set root password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;

# Create application user
CREATE USER 'taskflow'@'localhost' IDENTIFIED BY 'taskflow';
GRANT ALL PRIVILEGES ON taskflow_notifications_dev.* TO 'taskflow'@'localhost';
FLUSH PRIVILEGES;

# Test new user
mysql -u taskflow -p taskflow_notifications_dev
```

---

### Problem: Database Tables Dont Exist

**Symptom:** `Error: relation "users" does not exist`

**Solution:**

```bash
# Check if tables exist
# PostgreSQL
psql -d taskflow_auth_dev -c "\dt"

# MongoDB
mongo taskflow_tasks_dev --eval "db.getCollectionNames()"

# MySQL
mysql -u root taskflow_notifications_dev -e "SHOW TABLES;"

# If missing, run initialization scripts
# PostgreSQL
psql -U postgres -d taskflow_auth_dev -f scripts/init-postgres.sql

# MongoDB
mongo taskflow_tasks_dev < scripts/init-mongo.js

# MySQL
mysql -u root taskflow_notifications_dev < scripts/init-mysql.sql
```

---

## Authentication & Token Issues

### Problem: No Token Provided Error

**Symptom:** `Error: No token provided` on protected routes

**Solution:**

```bash
# Verify Authorization header is sent
# Correct format:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Check in browser DevTools
# Network tab → Request Headers → Authorization

# Ensure frontend is sending token from localStorage
const token = localStorage.getItem('accessToken');
const config = {
  headers: { Authorization: `Bearer ${token}` }
};
axios.get('/api/tasks/projects', config);
```

**Manual test:**
```bash
# Get token first
TOKEN=$(curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass"}' | jq -r '.accessToken')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:4001/api/auth/me
```

---

### Problem: Invalid Token Error

**Symptom:** `Error: Invalid token` or `JsonWebTokenError: jwt malformed`

**Solution:**

```bash
# Verify JWT_SECRET matches
# Check .env files in all services use same JWT_SECRET

# Check token expiration
# Token payload (decode at jwt.io):
# iat: issued at timestamp
# exp: expiration timestamp (should be in future)

# Use refresh token to get new access token
const response = await axios.post('/api/auth/refresh', {
  refreshToken: refreshToken
});

// Update stored token
localStorage.setItem('accessToken', response.data.accessToken);

# In code, verify JWT_SECRET
console.log('JWT_SECRET:', process.env.JWT_SECRET);
```

---

### Problem: Token Expired

**Symptom:** `TokenExpiredError: jwt expired`

**Solution:**

```bash
# Check token expiration time
# Decode token at jwt.io and check exp field
# exp: 1711134900 (Unix timestamp in seconds)

# Convert to readable date
node -e "console.log(new Date(1711134900000))"

# Solution: Use refresh token to get new access token
# Implement refresh logic in frontend

const refreshAccessToken = async () => {
  try {
    const response = await axios.post('/api/auth/refresh', {
      refreshToken: localStorage.getItem('refreshToken')
    });
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data.accessToken;
  } catch (error) {
    // Redirect to login
    window.location.href = '/login';
  }
};

# Or increase token expiration temporarily for testing
JWT_EXPIRES_IN=7d  # instead of 15m
```

---

### Problem: CORS Error with Token

**Symptom:** 
```
Access to XMLHttpRequest blocked by CORS policy
Response headers not exposed: authorization
```

**Solution:**

```bash
# Add CORS headers to Express services
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true,
  exposedHeaders: ['Authorization']  // Important for token
}));

# Or in Nginx
add_header 'Access-Control-Expose-Headers' 'Authorization';

# Update .env CORS_ORIGIN
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173

# Verify frontend URL matches
# Check browser console for exact origin being blocked
```

---

## Service Communication Problems

### Problem: Services Cant Reach Each Other

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:4001` when calling from task-service

**Solution (Docker):**

```bash
# Services must use service name, not localhost
# WRONG:
AUTH_SERVICE_URL=http://localhost:4001

# CORRECT (when using docker):
AUTH_SERVICE_URL=http://auth-service:4001

# Verify network connectivity in Docker
docker network ls
docker network inspect taskflow_network

# Check service DNS resolution
docker exec task-service ping -c 1 auth-service
```

**Solution (Local Development):**

```bash
# All services must be running
# Terminal 1: Auth Service (port 4001)
# Terminal 2: Task Service (port 4002)
# Terminal 3: Notification Service (port 4003)

# Verify ports are open
lsof -i :4001
lsof -i :4002
lsof -i :4003

# Test connectivity
curl http://localhost:4001/api/auth/me -H "Authorization: Bearer ..."
```

---

### Problem: Service Calls Timing Out

**Symptom:** `Error: Timeout - Service call took too long`

**Solution:**

```javascript
// Add timeout and retry logic
const axios = require('axios');

const api = axios.create({
  timeout: 10000,  // 10 second timeout
  baseURL: 'http://localhost:4001'
});

// Retry logic
const retryRequest = async (config, retries = 3) => {
  try {
    return await api(config);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... (${3 - retries + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retryRequest(config, retries - 1);
    }
    throw error;
  }
};
```

---

## Docker & Container Issues

### Problem: Container Exits Immediately

**Symptom:** `Container exits with code 1`

**Solution:**

```bash
# Check container logs
docker logs <container_id>

# View detailed logs
docker logs --follow <container_id>

# Check container status
docker ps -a
docker inspect <container_id>

# Common causes:
# 1. Port already in use (EADDRINUSE)
# 2. Database connection failed
# 3. Environment variable missing

# Check environment variables
docker exec <container_id> env | grep DB_
```

---

### Problem: Docker Compose Build Fails

**Symptom:** `ERROR: Service 'auth-service' failed to build`

**Solution:**

```bash
# View build logs
docker-compose build --no-cache auth-service 2>&1 | tail -50

# Common issues:
# 1. npm install failures
docker-compose build --no-cache auth-service --verbose

# 2. Base image not found
# Update docker-compose.yml image references

# 3. File not found in build context
docker-compose build --no-cache auth-service --platform linux/amd64

# Rebuild all
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Problem: Database Container Not Initializing

**Symptom:** Tables dont exist after `docker-compose up`

**Solution:**

```bash
# Check if init script ran
docker logs taskflow_postgres

# Verify init script path in compose
volumes:
  - ./scripts/init-postgres.sql:/docker-entrypoint-initdb.d/01-init.sql

# If already created volume, delete it
docker volume rm taskflow_postgres_data

# Reinitialize
docker-compose down -v
docker-compose up -d postgres

# Manually run init script
docker exec -i taskflow_postgres psql -U postgres -d taskflow_auth < scripts/init-postgres.sql
```

---

### Problem: Container Cant Access Network

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**

```bash
# Verify network exists
docker network ls | grep taskflow

# Check container network connection
docker inspect task-service | grep NetworkSettings

# Force container to use correct network
# In docker-compose.yml:
services:
  task-service:
    networks:
      - taskflow_network    # Must be defined

networks:
  taskflow_network:
    driver: bridge

# Restart with correct network
docker-compose down
docker-compose up -d
```

---

## Frontend Issues

### Problem: CORS Error

**Symptom:** 
```
Access to XMLHttpRequest blocked by CORS policy
No 'Access-Control-Allow-Origin' header
```

**Solution:**

```javascript
// Backend (Express)
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000,http://localhost:5173'.split(','),
  credentials: true
}));

// Nginx
add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
add_header 'Access-Control-Allow-Methods' 'GET,POST,PUT,DELETE,OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type,Authorization' always;

if ($request_method = 'OPTIONS') {
  return 204;
}
```

---

### Problem: Blank Page on Frontend

**Symptom:** Frontend loads but shows nothing

**Solution:**

```bash
# Check browser console for errors
# F12 → Console tab

# Check network requests
# Verify API calls succeed with 200 status

# Clear cache
# Ctrl+Shift+Delete (Windows/Linux)
# Cmd+Shift+Delete (macOS)

# Restart frontend dev server
npm run dev

# Check environment variables
# .env or .env.local should have:
REACT_APP_API_URL=http://localhost:8080
# Or
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

### Problem: API Calls Show 404

**Symptom:** All API requests return 404

**Solution:**

```bash
# Verify API Gateway is running
curl http://localhost:8080/api/auth/login -v

# Check Nginx config
cat /etc/nginx/nginx.conf or nginx/nginx.conf

# Verify upstream services are running
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health

# Check Nginx logs
docker logs taskflow_gateway
tail -f /var/log/nginx/error.log

# Reload Nginx
nginx -s reload
docker exec taskflow_gateway nginx -s reload
```

---

## Performance & Timeout Issues

### Problem: Slow API Response

**Symptom:** Requests take 10+ seconds to complete

**Solution:**

```bash
# Check database query performance
# MongoDB explain plan
db.projects.find({ owner_id: 'xxx' }).explain('executionStats')

# PostgreSQL explain
EXPLAIN ANALYZE SELECT * FROM users WHERE id = 'xxx';

# Check service logs
docker logs task-service | tail -100

# Add performance monitoring
npm install --save-dev clinic

clinic doctor -- npm start
```

**Optimization:**

```javascript
// Add indexes (already in schemas)
// Cache frequently accessed data
const NodeCache = require('node-cache');
const cache = new NodeCache({ std: 300 });

app.get('/projects', async (req, res) => {
  const key = `projects:${req.user.id}`;
  let projects = cache.get(key);
  
  if (!projects) {
    projects = await Project.find({ members: req.user.id });
    cache.set(key, projects);
  }
  
  res.json(projects);
});
```

---

### Problem: Memory Leak

**Symptom:** Service memory usage constantly increases

**Solution:**

```bash
# Check memory usage
docker stats taskflow_auth

# Generate heap dump
node --max-old-space-size=4096 src/index.js

# Use clinic.js to detect memory leak
npm install -g clinic
clinic bubbleprof -- npm start

# Fix common causes
# 1. Event listener not removed
emitter.removeListener('event', handler);

# 2. Circular references
// Don't store parent-child with cross references

# 3. Timers not cleared
clearInterval(intervalId);
clearTimeout(timeoutId);
```

---

### Problem: Max Listeners Exceeded Warning

**Symptom:** `MaxListenersExceededWarning: Possible EventEmitter memory leak detected`

**Solution:**

```javascript
// Increase max listeners
process.setMaxListeners(20);

// Or specific emitter
emitter.setMaxListeners(20);

// Better: Find and fix the leak
// Use: node --trace-warnings
NODE_OPTIONS='--trace-warnings' npm start
```

---

## Log Analysis & Debugging

### Enable Debug Logging

```bash
# Node.js debug
DEBUG=* npm start
DEBUG=taskflow:* npm start

# Specific module
DEBUG=taskflow:auth npm start

# Verbose PostgreSQL
PGOPTIONS='-c log_statement=all' psql ...

# MongoDB debug
mongod --logpath /var/log/mongodb/mongod.log --verbose
```

### Parse JSON Logs

```bash
# Install jq
brew install jq  # macOS
apt-get install jq  # Linux

# Filter logs
docker logs task-service | jq '.level'
docker logs task-service | jq 'select(.level == "error")'

# Format for readability
docker logs task-service | jq '.'
```

### Persistent Logging

```bash
# Save container logs
docker logs taskflow_auth > logs/auth.log 2>&1

# Follow logs in background
docker logs -f taskflow_auth >> logs/auth.log 2>&1 &

# Aggregate logs
docker-compose logs > logs/all-services.log
```

---

## Data & Migration Issues

### Problem: Corrupted Data in Database

**Symptom:** `Database integrity constraint violation`

**Solution (Backup & Restore):**

```bash
# PostgreSQL backup
pg_dump taskflow_auth_dev > backup.sql

# MongoDB backup
mongodump --db taskflow_tasks_dev --out backup/

# MySQL backup
mysqldump taskflow_notifications_dev > backup.sql

# Restore from backup
psql taskflow_auth_dev < backup.sql
mongorestore --db taskflow_tasks_dev backup/
mysql taskflow_notifications_dev < backup.sql
```

---

### Problem: Missing Data After Delete

**Symptom:** Records deleted unexpectedly

**Solution:**

```bash
# Check cascade delete rules
# PostgreSQL
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'tasks';

# MongoDB - check delete operations
db.tasks.find({})

# Restore from backup if critical
# See backup & restore section above
```

---

## Email/Notification Issues

### Problem: Notifications Not Appearing

**Symptom:** Tasks created but no notifications in UI

**Solution:**

```bash
# Check notification service health
curl http://localhost:4003/health

# Verify task service calls notify service
docker logs task-service | grep -i notify

# Check MySQL notifications table
mysql taskflow_notifications_dev -e "SELECT * FROM notifications;"

# Check for errors in notify-service logs
docker logs taskflow_notify

# Test notification endpoint manually
curl -X POST http://localhost:4003/api/notify/internal \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-uuid",
    "type": "task_assigned",
    "title": "Test",
    "message": "Test notification"
  }'

# Check if notifications appear
mysql taskflow_notifications_dev -e "SELECT * FROM notifications ORDER BY id DESC LIMIT 1;"
```

---

### Problem: Email Not Sending

**Symptom:** No emails received after notification creation

**Solution (if email integration added):**

```bash
# Check SMTP configuration
grep SMTP_ .env

# Test email connection
npm install --save-dev nodemailer
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
transporter.verify((err, success) => {
  if (err) console.log('Email config error:', err);
  else console.log('Email config OK');
});
"

# Check email service logs
tail -f /var/log/syslog | grep mail
```

---

## Emergency Recovery

### Complete Database Reset

**⚠️ Warning: This deletes all data!**

```bash
# PostgreSQL - Full reset
dropdb -U postgres taskflow_auth_dev
createdb -U postgres taskflow_auth_dev
psql -U postgres -d taskflow_auth_dev -f scripts/init-postgres.sql

# MongoDB - Full reset
mongo taskflow_tasks_dev --eval "db.dropDatabase();"
mongo taskflow_tasks_dev < scripts/init-mongo.js

# MySQL - Full reset
mysql -u root -e "DROP DATABASE taskflow_notifications_dev;"
mysql -u root -e "CREATE DATABASE taskflow_notifications_dev;"
mysql -u root taskflow_notifications_dev < scripts/init-mysql.sql
```

### Restart Everything

```bash
# Docker Compose reset
docker-compose down
docker-compose down -v  # Also remove volumes
docker-compose up -d

# Or complete reset
docker-compose down -v --remove-orphans
docker system prune -a
docker-compose up -d --build
```

---

**For additional help:** Check service logs, enable debug logging, and verify all environment variables are set correctly. When opening GitHub issues, include relevant logs and reproduction steps.
