# Docker Compose Setup — TaskFlow Microservices

This guide walks you through containerizing and running the full TaskFlow project using Docker Compose. It covers every service — auth, task, notification, frontend, three databases, and an nginx API gateway — wired together on a shared network with health checks, named volumes, and environment-driven configuration.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Environment Variables (.env)](#environment-variables-env)
5. [docker-compose.yml](#docker-composeyml)
6. [nginx Configuration](#nginx-configuration)
7. [Running the Stack](#running-the-stack)
8. [Multi-Language Variants](#multi-language-variants)
9. [Troubleshooting](#troubleshooting)
10. [Production Tips](#production-tips)

---

## Overview

TaskFlow is a microservice application split into four backend services, one frontend, three databases, and an nginx reverse proxy that acts as the single entry point for all traffic.

| Service               | Language        | Internal Port | Exposed Port |
|-----------------------|-----------------|---------------|--------------|
| nginx (API gateway)   | —               | 80            | 8080         |
| auth-service          | Node/Python/Go  | 4001          | —            |
| task-service          | Node/Python/Go  | 4002          | —            |
| notification-service  | Node/Python/Go  | 4003          | —            |
| frontend              | React / Next.js | 3000          | —            |
| postgres              | PostgreSQL 16   | 5432          | —            |
| mongo                 | MongoDB 7       | 27017         | —            |
| mysql                 | MySQL 8         | 3306          | —            |

All services share the `taskflow` bridge network. Databases are **not** exposed to the host; only nginx is reachable on port 8080.

---

## Prerequisites

| Tool           | Minimum version | Check command             |
|----------------|-----------------|---------------------------|
| Docker Engine  | 24.x            | `docker --version`        |
| Docker Compose | v2 (plugin)     | `docker compose version`  |
| Available RAM  | 4 GB            | —                         |
| Available disk | 10 GB           | —                         |

> **Note:** All commands use the `docker compose` (v2 plugin) syntax, not the legacy `docker-compose` binary.

---

## Project Structure

Expect the following layout before running any commands:

```
taskflow/
├── docker-compose.yml
├── .env
├── nginx/
│   └── nginx.conf
├── auth-service/
│   └── Dockerfile          # Node.js / Python / Go variant
├── task-service/
│   └── Dockerfile
├── notification-service/
│   └── Dockerfile
└── frontend/
    └── Dockerfile
```

Each service directory must contain a `Dockerfile`. See the [Multi-Language Variants](#multi-language-variants) section for example Dockerfiles per language.

---

## Environment Variables (.env)

Create a `.env` file at the project root. Docker Compose automatically loads it.

```dotenv
# ── Compose project ────────────────────────────────────────────────────────────
COMPOSE_PROJECT_NAME=taskflow

# ── PostgreSQL (auth-service) ──────────────────────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=authdb
POSTGRES_USER=authuser
POSTGRES_PASSWORD=authpassword

# ── MongoDB (task-service) ─────────────────────────────────────────────────────
MONGO_HOST=mongo
MONGO_PORT=27017
MONGO_DB=taskdb
MONGO_USER=taskuser
MONGO_PASSWORD=taskpassword
MONGO_URI=mongodb://taskuser:taskpassword@mongo:27017/taskdb?authSource=admin

# ── MySQL (notification-service) ───────────────────────────────────────────────
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DB=notifydb
MYSQL_USER=notifyuser
MYSQL_PASSWORD=notifypassword
MYSQL_ROOT_PASSWORD=rootpassword

# ── Auth service ───────────────────────────────────────────────────────────────
AUTH_SERVICE_PORT=4001
JWT_SECRET=change-me-in-production-super-secret-key
JWT_EXPIRES_IN=7d

# ── Task service ───────────────────────────────────────────────────────────────
TASK_SERVICE_PORT=4002

# ── Notification service ───────────────────────────────────────────────────────
NOTIFICATION_SERVICE_PORT=4003
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=smtp-password

# ── Frontend ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
```

> **Security:** Never commit `.env` to version control. Add it to `.gitignore`. For production, use `.env.production` or a secrets manager.

---

## docker-compose.yml

```yaml
# docker-compose.yml
# TaskFlow — full microservice stack
# Requires Docker Compose v2 (docker compose, not docker-compose)

name: taskflow

# ── Shared network ─────────────────────────────────────────────────────────────
networks:
  taskflow:
    driver: bridge

# ── Named volumes for persistent data ─────────────────────────────────────────
volumes:
  postgres_data:
  mongo_data:
  mysql_data:

# ── Services ───────────────────────────────────────────────────────────────────
services:

  # ── nginx API Gateway ────────────────────────────────────────────────────────
  nginx:
    image: nginx:1.25-alpine
    container_name: taskflow-nginx
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      auth-service:
        condition: service_healthy
      task-service:
        condition: service_healthy
      notification-service:
        condition: service_healthy
      frontend:
        condition: service_healthy
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/healthz"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ── Auth Service ─────────────────────────────────────────────────────────────
  auth-service:
    build:
      context: ./auth-service
      dockerfile: Dockerfile
      # To switch languages, change this to:
      #   dockerfile: Dockerfile.python
      #   dockerfile: Dockerfile.go
    container_name: taskflow-auth
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: ${AUTH_SERVICE_PORT:-4001}
      POSTGRES_HOST: ${POSTGRES_HOST}
      POSTGRES_PORT: ${POSTGRES_PORT}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4001/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s

  # ── Task Service ─────────────────────────────────────────────────────────────
  task-service:
    build:
      context: ./task-service
      dockerfile: Dockerfile
    container_name: taskflow-task
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: ${TASK_SERVICE_PORT:-4002}
      MONGO_URI: ${MONGO_URI}
      MONGO_HOST: ${MONGO_HOST}
      MONGO_PORT: ${MONGO_PORT}
      MONGO_DB: ${MONGO_DB}
      MONGO_USER: ${MONGO_USER}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4002/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s

  # ── Notification Service ─────────────────────────────────────────────────────
  notification-service:
    build:
      context: ./notification-service
      dockerfile: Dockerfile
    container_name: taskflow-notification
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: ${NOTIFICATION_SERVICE_PORT:-4003}
      MYSQL_HOST: ${MYSQL_HOST}
      MYSQL_PORT: ${MYSQL_PORT}
      MYSQL_DB: ${MYSQL_DB}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      DATABASE_URL: mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4003/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s

  # ── Frontend ─────────────────────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8080}
    container_name: taskflow-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8080}
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  # ── PostgreSQL ───────────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: taskflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - taskflow
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

  # ── MongoDB ──────────────────────────────────────────────────────────────────
  mongo:
    image: mongo:7-jammy
    container_name: taskflow-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DB}
    volumes:
      - mongo_data:/data/db
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  # ── MySQL ─────────────────────────────────────────────────────────────────────
  mysql:
    image: mysql:8-debian
    container_name: taskflow-mysql
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${MYSQL_DB}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - taskflow
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost",
             "-u", "${MYSQL_USER}", "-p${MYSQL_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

---

## nginx Configuration

Create `nginx/nginx.conf` with the following content:

```nginx
# nginx/nginx.conf

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid       /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';

    access_log /var/log/nginx/access.log main;

    sendfile        on;
    keepalive_timeout 65;

    # ── Upstream blocks ───────────────────────────────────────────────────────

    upstream auth_service {
        server auth-service:4001;
        keepalive 16;
    }

    upstream task_service {
        server task-service:4002;
        keepalive 16;
    }

    upstream notification_service {
        server notification-service:4003;
        keepalive 16;
    }

    upstream frontend_app {
        server frontend:3000;
        keepalive 16;
    }

    # ── CORS helper map ───────────────────────────────────────────────────────

    map $http_origin $cors_origin {
        default "";
        "http://localhost:3000"  $http_origin;
        "http://localhost:8080"  $http_origin;
    }

    # ── Main server block ─────────────────────────────────────────────────────

    server {
        listen 80;
        server_name _;

        # Health check endpoint for Docker / load balancers
        location /healthz {
            access_log off;
            return 200 "ok\n";
            add_header Content-Type text/plain;
        }

        # ── CORS and proxy header macros ──────────────────────────────────────
        # Applied to every proxied location via include or inline.

        # ── Auth service ──────────────────────────────────────────────────────
        location /api/auth/ {
            # CORS preflight
            if ($request_method = OPTIONS) {
                add_header Access-Control-Allow-Origin  $cors_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
                add_header Access-Control-Allow-Credentials "true" always;
                add_header Content-Length 0;
                return 204;
            }

            add_header Access-Control-Allow-Origin      $cors_origin always;
            add_header Access-Control-Allow-Credentials "true" always;

            proxy_pass         http://auth_service;
            proxy_http_version 1.1;
            proxy_set_header   Connection        "";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 30s;
        }

        # ── Users (also handled by auth service) ──────────────────────────────
        location /api/users/ {
            if ($request_method = OPTIONS) {
                add_header Access-Control-Allow-Origin  $cors_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
                add_header Access-Control-Allow-Credentials "true" always;
                add_header Content-Length 0;
                return 204;
            }

            add_header Access-Control-Allow-Origin      $cors_origin always;
            add_header Access-Control-Allow-Credentials "true" always;

            proxy_pass         http://auth_service;
            proxy_http_version 1.1;
            proxy_set_header   Connection        "";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 30s;
        }

        # ── Task service ──────────────────────────────────────────────────────
        location /api/tasks/ {
            if ($request_method = OPTIONS) {
                add_header Access-Control-Allow-Origin  $cors_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
                add_header Access-Control-Allow-Credentials "true" always;
                add_header Content-Length 0;
                return 204;
            }

            add_header Access-Control-Allow-Origin      $cors_origin always;
            add_header Access-Control-Allow-Credentials "true" always;

            proxy_pass         http://task_service;
            proxy_http_version 1.1;
            proxy_set_header   Connection        "";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 30s;
        }

        # ── Notification service ──────────────────────────────────────────────
        location /api/notify/ {
            if ($request_method = OPTIONS) {
                add_header Access-Control-Allow-Origin  $cors_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
                add_header Access-Control-Allow-Credentials "true" always;
                add_header Content-Length 0;
                return 204;
            }

            add_header Access-Control-Allow-Origin      $cors_origin always;
            add_header Access-Control-Allow-Credentials "true" always;

            proxy_pass         http://notification_service;
            proxy_http_version 1.1;
            proxy_set_header   Connection        "";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 30s;
        }

        # ── Frontend (catch-all) ──────────────────────────────────────────────
        location / {
            proxy_pass         http://frontend_app;
            proxy_http_version 1.1;
            # Required for Next.js hot-reload websocket in development
            proxy_set_header   Upgrade           $http_upgrade;
            proxy_set_header   Connection        "upgrade";
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }
    }
}
```

---

## Running the Stack

### First-time startup (build all images)

```bash
# Build all images and start every service in the foreground.
# Use this the first time or after changing any Dockerfile.
docker compose up --build
```

### Start in detached mode

```bash
# Start all services in the background.
docker compose up -d
```

After a few seconds open `http://localhost:8080` in your browser. The nginx gateway routes all traffic.

### View logs

```bash
# Follow logs for all services
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f auth-service
docker compose logs -f task-service
docker compose logs -f notification-service
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
docker compose logs -f mongo
docker compose logs -f mysql
```

### Check running containers

```bash
docker compose ps
```

Sample output:

```
NAME                      IMAGE                COMMAND               SERVICE              STATUS              PORTS
taskflow-auth             taskflow-auth-service  ...                 auth-service         Up (healthy)
taskflow-frontend         taskflow-frontend      ...                 frontend             Up (healthy)
taskflow-mongo            mongo:7-jammy          ...                 mongo                Up (healthy)
taskflow-mysql            mysql:8-debian         ...                 mysql                Up (healthy)
taskflow-nginx            nginx:1.25-alpine      ...                 nginx                Up (healthy)        0.0.0.0:8080->80/tcp
taskflow-notification     taskflow-notification  ...                 notification-service Up (healthy)
taskflow-postgres         postgres:16-alpine     ...                 postgres             Up (healthy)
taskflow-task             taskflow-task-service  ...                 task-service         Up (healthy)
```

### Rebuild a single service

Rebuild only one service without restarting the rest:

```bash
# Rebuild the image
docker compose build auth-service

# Then restart only that container
docker compose up -d --no-deps auth-service
```

The `--no-deps` flag prevents Docker Compose from restarting dependent services.

### Stop the stack

```bash
# Stop all containers, keep volumes
docker compose down

# Stop all containers AND delete named volumes (destroys all database data)
docker compose down -v
```

---

## Multi-Language Variants

Each backend service can be written in Node.js, Python, or Go. The only change required in `docker-compose.yml` is the `dockerfile` key inside the `build` block. Keep all Dockerfiles in the service directory.

### Switching languages

In `docker-compose.yml`, change the `dockerfile` entry for the relevant service:

```yaml
# Node.js (default)
build:
  context: ./auth-service
  dockerfile: Dockerfile          # Dockerfile.node also accepted

# Python
build:
  context: ./auth-service
  dockerfile: Dockerfile.python

# Go
build:
  context: ./auth-service
  dockerfile: Dockerfile.go
```

### Example Dockerfiles

#### Node.js — `Dockerfile`

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:4001/health || exit 1
CMD ["node", "src/index.js"]
```

#### Python — `Dockerfile.python`

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
EXPOSE 4001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4001/health')" || exit 1
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4001"]
```

#### Go — `Dockerfile.go`

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o service ./cmd/server

FROM alpine:3.19 AS runner
RUN apk add --no-cache wget
WORKDIR /app
COPY --from=builder /app/service .
EXPOSE 4001
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:4001/health || exit 1
CMD ["./service"]
```

> The port numbers above use `4001` (auth-service) as the example. Replace with `4002` or `4003` for the task and notification services respectively.

### Frontend variants

| Framework | Base image                   | Build command                |
|-----------|------------------------------|------------------------------|
| Next.js   | `node:22-alpine`             | `npm run build && npm start` |
| React SPA | `node:22-alpine` + `nginx`   | `npm run build`, serve dist  |

#### Next.js — `frontend/Dockerfile`

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3000 || exit 1
CMD ["node", "server.js"]
```

---

## Troubleshooting

### Port conflicts

**Symptom:** `bind: address already in use` on port 8080.

**Fix:** Find and stop the conflicting process:

```bash
# Find which process is using port 8080
sudo lsof -i :8080

# Kill it (replace <PID> with the actual PID)
sudo kill -9 <PID>

# Or change the host port in docker-compose.yml
ports:
  - "9090:80"   # use 9090 instead of 8080
```

### Volume permission errors

**Symptom:** PostgreSQL or MySQL logs show `permission denied` or `could not open file`.

**Fix:** Docker-managed named volumes (`postgres_data`, etc.) are owned by root inside the container. If you previously ran a database natively or bind-mounted a host path, leftover ownership can cause issues. The safest fix is to remove the volume and let the database reinitialise:

```bash
# Remove a specific volume (destroys all data in it)
docker compose down
docker volume rm taskflow_postgres_data

# Or remove all project volumes
docker compose down -v
```

If you need to preserve data, check ownership manually:

```bash
docker run --rm -v taskflow_postgres_data:/data alpine ls -la /data
```

### Health check failures / service never becomes healthy

**Symptom:** `docker compose ps` shows a service as `starting` indefinitely, or dependent services exit immediately.

**Checks:**

1. Confirm the service exposes a `/health` endpoint returning HTTP 200.
2. Increase `start_period` for slow-starting services (Java, Python with large imports, databases with slow init scripts).
3. Look at the unhealthy container's logs: `docker compose logs <service>`.
4. Test the health endpoint manually from inside the container:

```bash
docker exec taskflow-auth wget -qO- http://localhost:4001/health
```

5. For databases, verify the credentials in `.env` match those used by the health check command.

### Service cannot reach its database

**Symptom:** `ECONNREFUSED`, `Connection refused`, or `dial tcp` errors in service logs.

**Fix:** All services and databases share the `taskflow` network. Services must reference the database by its **service name** (e.g., `postgres`, `mongo`, `mysql`), not `localhost`. Confirm your environment variables use the service names defined in `docker-compose.yml`:

```bash
# Correct
POSTGRES_HOST=postgres

# Wrong — this resolves to the container itself
POSTGRES_HOST=localhost
```

### nginx returns 502 Bad Gateway

**Symptom:** Requests to `http://localhost:8080/api/...` return 502.

**Checks:**

1. Make sure the upstream service is healthy: `docker compose ps`.
2. Verify the container names in `nginx.conf` match the service names in `docker-compose.yml`.
3. Check nginx error logs: `docker compose logs nginx`.

### Database data is lost after `docker compose down`

`docker compose down` without `-v` preserves named volumes. If data is lost, you likely ran `docker compose down -v` previously, or you are using bind mounts without persistent paths. Switch to named volumes as shown in the `docker-compose.yml` above.

---

## Production Tips

### Set restart policies

All services already have `restart: unless-stopped`. For production swap to:

```yaml
restart: always
```

This ensures containers restart after a host reboot.

### Add resource limits

Prevent any single container from consuming all host resources:

```yaml
services:
  auth-service:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
```

> `deploy.resources` is respected by `docker compose` when running without Swarm mode since Compose v2.

### Use a production environment file

Keep development and production variables separate:

```bash
# Start with production overrides
docker compose --env-file .env.production up -d
```

`.env.production` should override at minimum:

```dotenv
NODE_ENV=production
JWT_SECRET=a-long-random-secret-generated-with-openssl-rand-hex-64
POSTGRES_PASSWORD=<strong-random-password>
MYSQL_PASSWORD=<strong-random-password>
MYSQL_ROOT_PASSWORD=<strong-random-root-password>
MONGO_PASSWORD=<strong-random-password>
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### Never expose databases to the host in production

The `docker-compose.yml` above does not publish database ports. Keep it that way. If you need direct database access for migrations or debugging, use:

```bash
# Open a psql shell without exposing the port
docker exec -it taskflow-postgres psql -U authuser -d authdb

# Or use a one-off container on the same network
docker run --rm -it --network taskflow postgres:16-alpine \
  psql -h postgres -U authuser -d authdb
```

### Use Docker secrets for sensitive values

For Swarm or more secure deployments, replace plaintext environment variables with Docker secrets:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

### Health check tuning for production

Tighten health check intervals once services are stable:

```yaml
healthcheck:
  interval: 30s    # Check less frequently
  timeout: 10s     # Allow slightly longer response time
  retries: 3
  start_period: 60s  # Give the service more time on cold boot
```

### Image tagging and pinning

Pin all image tags to specific patch versions to make builds reproducible:

```yaml
image: postgres:16.3-alpine3.20   # instead of postgres:16-alpine
image: mongo:7.0.12-jammy         # instead of mongo:7-jammy
image: mysql:8.4.1-debian         # instead of mysql:8-debian
image: nginx:1.25.5-alpine3.20    # instead of nginx:1.25-alpine
```
