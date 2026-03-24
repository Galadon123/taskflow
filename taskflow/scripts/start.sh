#!/bin/bash

# TaskFlow Docker Compose Startup Script
# This script handles the complete setup and startup of the TaskFlow project

set -e

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│         TaskFlow - Docker Compose Startup Script             │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Docker and Docker Compose
echo -e "${BLUE}▶ Checking system requirements...${NC}"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from defaults...${NC}"
    cat > .env << 'EOF'
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

# ── MySQL (notification-service) ───────────────────────────────────────────────
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DB=notifydb
MYSQL_USER=notifyuser
MYSQL_PASSWORD=notifypassword
MYSQL_ROOT_PASSWORD=rootpassword

# ── Auth service ───────────────────────────────────────────────────────────────
AUTH_SERVICE_PORT=4001
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
JWT_EXPIRES_IN=15m

# ── Task service ───────────────────────────────────────────────────────────────
TASK_SERVICE_PORT=4002

# ── Notification service ───────────────────────────────────────────────────────
NOTIFICATION_SERVICE_PORT=4003

# ── Node environment ───────────────────────────────────────────────────────────
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""
echo -e "${BLUE}▶ Building Docker images...${NC}"

# Build all services
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker images built successfully${NC}"
else
    echo -e "${YELLOW}⚠ Some images may have failed to build${NC}"
fi

echo ""
echo -e "${BLUE}▶ Starting Docker containers...${NC}"

# Start services with proper dependency order
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker containers started${NC}"
else
    echo -e "${YELLOW}⚠ Some containers failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}▶ Waiting for services to become healthy...${NC}"

# Function to check if a service is healthy
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    printf "  △ $service: "
    
    while [ $attempt -lt $max_attempts ]; do
        health=$(docker inspect --format='{{.State.Health.Status}}' taskflow-$service 2>/dev/null || echo "starting")
        
        if [ "$health" = "healthy" ]; then
            echo -e "${GREEN}healthy${NC}"
            return 0
        fi
        
        printf "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${YELLOW}timeout${NC}"
    return 1
}

# Check all services
check_health "postgres"
check_health "mongo"
check_health "mysql"
check_health "auth"
check_health "task"
check_health "notification"
check_health "frontend"

echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│           ✓ TaskFlow is now running!                        │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${BLUE}Service URLs:${NC}"
echo -e "  • API Gateway:      ${GREEN}http://localhost:8080${NC}"
echo -e "  • Auth Service:     ${GREEN}http://localhost:4001${NC}"
echo -e "  • Task Service:     ${GREEN}http://localhost:4002${NC}"
echo -e "  • Notify Service:   ${GREEN}http://localhost:4003${NC}"
echo -e "  • React Frontend:   ${GREEN}http://localhost:8080${NC}"
echo -e "  • Next.js Frontend: ${GREEN}http://localhost:3000 (if enabled)${NC}"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:"
echo "    docker-compose logs -f                  # All services"
echo "    docker-compose logs -f auth-service     # Specific service"
echo ""
echo "  Stop services:"
echo "    docker-compose down                     # Stop containers"
echo "    docker-compose down -v                  # Stop and remove volumes"
echo ""
echo "  Test API:"
echo "    curl -X POST http://localhost:8080/api/auth/register \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"name\":\"Test\",\"email\":\"test@example.com\",\"password\":\"pass123\"}'"
echo ""

echo -e "${YELLOW}💡 Pro Tips:${NC}"
echo "  • Check logs if services don't start: docker-compose logs"
echo "  • Full reset:  docker-compose down -v && docker-compose up -d --build"
echo "  • Database shell: docker exec -it taskflow-postgres psql -U authuser authdb"
echo ""
