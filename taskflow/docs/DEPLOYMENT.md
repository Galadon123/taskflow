# DEPLOYMENT GUIDE — Production Deployment & Scaling

This guide covers deploying TaskFlow to production environments, from Docker Compose deployment to Kubernetes-ready architecture.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Compose Production Setup](#docker-compose-production-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Initialization](#database-initialization)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Nginx Advanced Configuration](#nginx-advanced-configuration)
7. [Health Checks & Monitoring](#health-checks--monitoring)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling Strategies](#scaling-strategies)
10. [Kubernetes Deployment (Optional)](#kubernetes-deployment-optional)

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured (.env file)
- [ ] SSL/TLS certificates obtained (Let's Encrypt recommended)
- [ ] Database backups enabled
- [ ] Monitoring & alerting configured
- [ ] Logging aggregation setup (ELK, Datadog, etc.)
- [ ] Load balancer configured (if scaling)
- [ ] Firewall rules configured (port 443, 80)
- [ ] Database credentials stored in secrets manager
- [ ] Image registry setup (Docker Hub, ECR, etc.)
- [ ] CI/CD pipeline configured
- [ ] Rate limiting enabled at API Gateway
- [ ] CORS origins whitelisted for specific domains

---

## Docker Compose Production Setup

### Production Docker Compose File

```yaml
version: '3.9'

services:
  # PostgreSQL - Auth Service
  postgres:
    image: postgres:16-alpine
    container_name: taskflow_postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-postgres.sql:/docker-entrypoint-initdb.d/01-init.sql
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # MongoDB - Task Service
  mongodb:
    image: mongo:7-alpine
    container_name: taskflow_mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DB}
    volumes:
      - mongodb_data:/data/db
      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/01-init.js
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok'
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # MySQL - Notification Service
  mysql:
    image: mysql:8-alpine
    container_name: taskflow_mysql
    environment:
      MYSQL_DATABASE: ${MYSQL_DB}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init-mysql.sql:/docker-entrypoint-initdb.d/01-init.sql
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # Auth Service
  auth-service:
    image: taskflow/auth-service:latest
    container_name: taskflow_auth
    environment:
      NODE_ENV: production
      PORT: 4001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${POSTGRES_DB}
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      LOG_LEVEL: info
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4001/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # Task Service
  task-service:
    image: taskflow/task-service:latest
    container_name: taskflow_tasks
    environment:
      NODE_ENV: production
      PORT: 4002
      MONGO_URI: mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@mongodb:27017/${MONGO_DB}?authSource=admin
      AUTH_SERVICE_URL: http://auth-service:4001
      NOTIFY_SERVICE_URL: http://notify-service:4003
      LOG_LEVEL: info
    depends_on:
      mongodb:
        condition: service_healthy
      auth-service:
        condition: service_healthy
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4002/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # Notification Service
  notify-service:
    image: taskflow/notify-service:latest
    container_name: taskflow_notify
    environment:
      NODE_ENV: production
      PORT: 4003
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${MYSQL_DB}
      DB_USER: ${MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD}
      LOG_LEVEL: info
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4003/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # API Gateway (Nginx)
  api-gateway:
    image: nginx:1.25-alpine
    container_name: taskflow_gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - auth-service
      - task-service
      - notify-service
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Frontend
  frontend:
    image: taskflow/frontend:latest
    container_name: taskflow_frontend
    environment:
      REACT_APP_API_URL: https://api.example.com
    networks:
      - taskflow_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
    driver: local
  mongodb_data:
    driver: local
  mysql_data:
    driver: local
  nginx_cache:
    driver: local

networks:
  taskflow_network:
    driver: bridge
```

---

## Environment Configuration

### Production .env File

Create `.env.production` with production values:

```bash
# Node Environment
NODE_ENV=production

# PostgreSQL Configuration
POSTGRES_DB=taskflow_auth
POSTGRES_USER=taskflow_user
POSTGRES_PASSWORD=your_secure_postgres_password_here
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MongoDB Configuration
MONGO_USERNAME=taskflow_user
MONGO_PASSWORD=your_secure_mongo_password_here
MONGO_DB=taskflow_tasks
MONGO_HOST=mongodb
MONGO_PORT=27017

# MySQL Configuration
MYSQL_DB=taskflow_notifications
MYSQL_USER=taskflow_user
MYSQL_PASSWORD=your_secure_mysql_password_here
MYSQL_ROOT_PASSWORD=your_secure_root_password_here
MYSQL_HOST=mysql
MYSQL_PORT=3306

# JWT Configuration
JWT_SECRET=your_long_random_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_long_random_refresh_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Service URLs (Internal)
AUTH_SERVICE_URL=http://auth-service:4001
TASK_SERVICE_URL=http://task-service:4002
NOTIFY_SERVICE_URL=http://notify-service:4003

# API Gateway
GATEWAY_URL=https://api.example.com
GATEWAY_PORT=80
GATEWAY_HTTPS_PORT=443

# Frontend
FRONTEND_URL=https://app.example.com
FRONTEND_PORT=3000

# CORS
CORS_ORIGIN=https://app.example.com,https://www.example.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true

# Email Configuration (for future notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your_datadog_api_key
```

### Loading Environment Variables

```bash
# Production deployment
docker-compose -f docker-compose.yml --env-file .env.production up -d
```

---

## Database Initialization

### PostgreSQL Initialization Script

Create `scripts/init-postgres.sql`:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  role VARCHAR(50) DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh_tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create admin user (change password in production)
INSERT INTO users (name, email, password_hash, role) VALUES (
  'Admin User',
  'admin@example.com',
  '$2b$12$admin_password_hash',
  'admin'
);
```

### MongoDB Initialization Script

Create `scripts/init-mongo.js`:

```javascript
db = db.getSiblingDB('taskflow_tasks');

// Create projects collection
db.createCollection('projects');
db.projects.createIndex({ owner_id: 1 });
db.projects.createIndex({ members: 1 });
db.projects.createIndex({ created_at: -1 });

// Create tasks collection
db.createCollection('tasks');
db.tasks.createIndex({ project_id: 1, status: 1 });
db.tasks.createIndex({ assignee_id: 1 });
db.tasks.createIndex({ due_date: 1 });
db.tasks.createIndex({ created_at: -1 });

print('MongoDB collections initialized');
```

### MySQL Initialization Script

Create `scripts/init-mysql.sql`:

```sql
CREATE TABLE IF NOT EXISTS notifications (
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
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  task_assigned BOOLEAN DEFAULT TRUE,
  task_updated BOOLEAN DEFAULT TRUE,
  task_completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## SSL/TLS Configuration

### Obtaining SSL Certificates

**Using Let's Encrypt with Certbot:**

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot certonly --standalone -d api.example.com -d app.example.com

# Certificates stored in: /etc/letsencrypt/live/
```

### Nginx SSL Configuration

Create `nginx/conf.d/ssl.conf`:

```nginx
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Docker Volume for Certificates

```yaml
volumes:
  - /etc/letsencrypt/live/api.example.com:/etc/nginx/ssl:ro
```

---

## Nginx Advanced Configuration

### Production Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
  worker_connections 2048;
  use epoll;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  # Logging
  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                  '$status $body_bytes_sent "$http_referer" '
                  '"$http_user_agent" "$http_x_forwarded_for"';
  
  access_log /var/log/nginx/access.log main;

  # Performance
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;
  client_max_body_size 20M;

  # Gzip Compression
  gzip on;
  gzip_vary on;
  gzip_types text/plain text/css text/xml text/javascript 
             application/x-javascript application/xml+rss 
             application/json application/javascript;
  gzip_min_length 1000;

  # Rate Limiting
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
  
  # Upstream Services
  upstream auth_service {
    least_conn;
    server auth-service:4001 max_fails=3 fail_timeout=30s;
    keepalive 32;
  }

  upstream task_service {
    least_conn;
    server task-service:4002 max_fails=3 fail_timeout=30s;
    keepalive 32;
  }

  upstream notify_service {
    least_conn;
    server notify-service:4003 max_fails=3 fail_timeout=30s;
    keepalive 32;
  }

  upstream frontend {
    server frontend:3000;
  }

  # Health Check
  server {
    listen 80;
    server_name _;
    location /health {
      access_log off;
      return 200 "Healthy\n";
      add_header Content-Type text/plain;
    }
  }

  # HTTP to HTTPS Redirect
  server {
    listen 80;
    server_name api.example.com app.example.com;
    return 301 https://$server_name$request_uri;
  }

  # HTTPS for API Gateway
  server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Auth Service
    location /api/auth {
      limit_req zone=auth_limit burst=5;
      proxy_pass http://auth_service;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Task Service
    location /api/tasks {
      limit_req zone=api_limit burst=10;
      proxy_pass http://task_service;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Notification Service
    location /api/notify {
      limit_req zone=api_limit burst=10;
      proxy_pass http://notify_service;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
  }

  # HTTPS for Frontend
  server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
      proxy_pass http://frontend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
```

---

## Health Checks & Monitoring

### Application Health Endpoints

Add to each service (`/health`):

```javascript
// Express.js health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Monitoring Setup

**Prometheus Metrics (optional):**

```javascript
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .observe(duration);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

---

## Backup & Recovery

### Database Backup Strategies

**PostgreSQL Backup:**

```bash
#!/bin/bash
# backup-postgres.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# Full backup
docker exec taskflow_postgres pg_dump -U taskflow_user taskflow_auth | \
  gzip > "$BACKUP_DIR/auth_$DATE.sql.gz"

# Retention policy: keep 30 days
find "$BACKUP_DIR" -name "auth_*.sql.gz" -mtime +30 -delete
```

**MongoDB Backup:**

```bash
#!/bin/bash
# backup-mongo.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

docker exec taskflow_mongodb mongodump \
  --username taskflow_user \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --out "/backups/dump-$DATE"

tar -czf "$BACKUP_DIR/mongo_$DATE.tar.gz" "/backups/dump-$DATE"
```

**MySQL Backup:**

```bash
#!/bin/bash
# backup-mysql.sh

BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

docker exec taskflow_mysql mysqldump \
  -u taskflow_user -p$MYSQL_PASSWORD \
  taskflow_notifications | \
  gzip > "$BACKUP_DIR/notifications_$DATE.sql.gz"
```

### Cron Job for Automated Backups

```bash
# Add to crontab
0 2 * * * /backup-postgres.sh      # Daily at 2 AM
30 2 * * * /backup-mongo.sh        # Daily at 2:30 AM
0 3 * * * /backup-mysql.sh         # Daily at 3 AM
```

### Recovery Procedures

**PostgreSQL Recovery:**
```bash
gunzip -c /backups/postgres/auth_*.sql.gz | \
  docker exec -i taskflow_postgres psql -U taskflow_user taskflow_auth
```

**MongoDB Recovery:**
```bash
docker exec taskflow_mongodb mongorestore \
  --username taskflow_user \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  /path/to/dump
```

---

## Scaling Strategies

### Horizontal Scaling

**Multiple Service Instances:**

```yaml
# docker-compose.yml
services:
  auth-service:
    deploy:
      replicas: 3  # Scale to 3 instances
  
  task-service:
    deploy:
      replicas: 3
```

**Load Balancing Configuration:**

```nginx
upstream auth_service {
  least_conn;
  server auth-service-1:4001;
  server auth-service-2:4001;
  server auth-service-3:4001;
}
```

### Vertical Scaling

**Resource Limits:**

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '1'
      memory: 512M
```

### Caching Strategy

**Redis Cache (optional):**

```bash
# Add to docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

**Cache Implementation:**

```javascript
const redis = require('redis');
const client = redis.createClient({ host: 'redis', port: 6379 });

app.get('/api/tasks/projects', async (req, res) => {
  const cacheKey = `projects:${req.user.id}`;
  const cached = await client.get(cacheKey);
  
  if (cached) return res.json(JSON.parse(cached));
  
  const projects = await Project.find({ members: req.user.id });
  client.setex(cacheKey, 300, JSON.stringify(projects)); // 5 min cache
  res.json(projects);
});
```

---

## Kubernetes Deployment (Optional)

### Kubernetes Manifests

**Each service as a Deployment with Service:**

```yaml
# auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: taskflow/auth-service:latest
        ports:
        - containerPort: 4001
        env:
        - name: DB_HOST
          value: postgres-service
        - name: DB_PORT
          value: "5432"
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4001
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - protocol: TCP
    port: 4001
    targetPort: 4001
  type: ClusterIP
```

---

**Next:** Read [Development Guide](./DEVELOPMENT.md) for local development setup.
