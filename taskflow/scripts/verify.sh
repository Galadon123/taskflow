#!/bin/bash

# TaskFlow Docker Testing & Verification Script
# This script verifies all containers are running and performs health checks

set -e

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│     TaskFlow - Docker Services Verification Script          │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service_health() {
    local container=$1
    local port=$2
    local name=$3
    
    printf "  Checking ${name}... "
    
    # Check if container is running
    if ! docker ps | grep -q $container; then
        echo -e "${RED}❌ NOT RUNNING${NC}"
        return 1
    fi
    
    # Check if port is accessible
    if timeout 3 bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Port not responding${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3
    
    printf "  Testing ${endpoint}... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method http://localhost:8080$endpoint)
    else
        response=$(curl -s -X $method http://localhost:8080$endpoint \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if echo "$response" | grep -q "error\|Error" && [ -z "$4" ]; then
        echo -e "${YELLOW}⚠ Response contains 'error'${NC}"
        echo "    Response: $response" | head -c 100
        echo ""
        return 1
    elif [ -z "$response" ]; then
        echo -e "${RED}❌ No response${NC}"
        return 1
    else
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    fi
}

echo -e "${BLUE}▶ Step 1: Checking Docker containers...${NC}"

if ! docker ps -q > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Check each service
echo -e "${BLUE}▶ Step 2: Verifying services status...${NC}"

services=(
    "taskflow-postgres:5432:PostgreSQL"
    "taskflow-mongo:27017:MongoDB"
    "taskflow-mysql:3306:MySQL"
    "taskflow-auth:4001:Auth Service"
    "taskflow-task:4002:Task Service"
    "taskflow-notification:4003:Notification Service"
    "taskflow-frontend:3000:Frontend"
    "taskflow-nginx:80:Nginx Gateway"
)

failed_count=0
for service in "${services[@]}"; do
    IFS=':' read -r container port name <<< "$service"
    if ! check_service_health "$container" "$port" "$name"; then
        ((failed_count++))
    fi
done

echo ""

if [ $failed_count -gt 0 ]; then
    echo -e "${YELLOW}⚠ Warning: $failed_count service(s) may have issues${NC}"
    echo "  Run: docker-compose logs"
else
    echo -e "${GREEN}✓ All services running${NC}"
fi

echo ""
echo -e "${BLUE}▶ Step 3: Testing API endpoints...${NC}"

echo ""
echo "  Health checks:"
test_api_endpoint "/health" "GET"

echo ""
echo "  Authentication endpoints:"
test_api_endpoint "/api/auth/me" "GET" "" "auth-required"

echo ""
echo -e "${BLUE}▶ Step 4: Container Resource Usage...${NC}"
echo ""

docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -9

echo ""
echo -e "${BLUE}▶ Step 5: Volume Status...${NC}"
echo ""

volumes=$(docker volume ls | grep taskflow | awk '{print $2}')
if [ -z "$volumes" ]; then
    echo -e "${YELLOW}⚠ No TaskFlow volumes found${NC}"
else
    echo -e "${GREEN}✓ Docker volumes:${NC}"
    echo "$volumes" | while read vol; do
        echo "    • $vol"
    done
fi

echo ""
echo -e "${BLUE}▶ Step 6: Database Connectivity Tests...${NC}"
echo ""

# Test PostgreSQL
printf "  PostgreSQL: "
if docker exec taskflow-postgres pg_isready -U authuser > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
fi

# Test MongoDB
printf "  MongoDB: "
if docker exec taskflow-mongo mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
fi

# Test MySQL
printf "  MySQL: "
if docker exec taskflow-mysql mysqladmin ping -h localhost -u notifyuser -p"notifypassword" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
fi

echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│              ✓ Verification Complete!                       │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${BLUE}Quick Tips:${NC}"
echo "  • View logs:       docker-compose logs -f"
echo "  • Restart service: docker-compose restart <service>"
echo "  • Stop all:        docker-compose down"
echo "  • Full reset:      docker-compose down -v"
echo ""

echo -e "${BLUE}Test the API:${NC}"
echo "  curl http://localhost:8080/health"
echo ""
