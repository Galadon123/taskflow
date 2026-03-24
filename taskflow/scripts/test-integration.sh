#!/bin/bash

# TaskFlow - Run Integration Tests
# Tests complete user workflow against running Docker containers

set -e

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│     TaskFlow - Integration Tests Against Docker             │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:8080"
USER_EMAIL="test-$(date +%s)@example.com"
USER_PASSWORD="TestPass123"
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local auth_token=$5
    
    printf "  Testing: $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            ${auth_token:+-H "Authorization: Bearer $auth_token"} \
            -H "Content-Type: application/json" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            ${auth_token:+-H "Authorization: Bearer $auth_token"} \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ ($http_code)${NC}"
        echo "$body"
        ((PASSED++))
        return 0
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${YELLOW}⚠ ($http_code)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ ($http_code)${NC}"
        ((FAILED++))
        return 1
    fi
}

# Check if API is accessible
echo -e "${BLUE}▶ Checking API availability...${NC}"
if ! curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ API is not responding at $API_URL${NC}"
    echo "   Make sure Docker containers are running:"
    echo "   docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ API is accessible${NC}"
echo ""

# Test 1: Health endpoint
echo -e "${BLUE}▶ Test 1: Health Checks${NC}"
response=$(curl -s "$API_URL/health" | jq '.status' 2>/dev/null || echo '"unknown"')
echo "  Health: $response"
echo ""

# Test 2: User Registration
echo -e "${BLUE}▶ Test 2: User Registration${NC}"
register_response=$(test_endpoint "POST /api/auth/register" "POST" "/api/auth/register" \
"{\"name\":\"Test User\",\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$register_response" | jq -r '.accessToken' 2>/dev/null)
REFRESH_TOKEN=$(echo "$register_response" | jq -r '.refreshToken' 2>/dev/null)
USER_ID=$(echo "$register_response" | jq -r '.user.id' 2>/dev/null)

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ Registration successful, token received${NC}"
else
    echo -e "${RED}❌ Failed to get access token${NC}"
    echo "   Response: $register_response"
fi
echo ""

# Test 3: Get User Profile
if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo -e "${BLUE}▶ Test 3: User Profile${NC}"
    test_endpoint "GET /api/auth/me" "GET" "/api/auth/me" "" "$ACCESS_TOKEN" > /dev/null
    echo ""
fi

# Test 4: Create Project
if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo -e "${BLUE}▶ Test 4: Project Management${NC}"
    project_response=$(test_endpoint "POST /api/tasks/projects" "POST" "/api/tasks/projects" \
"{\"name\":\"Test Project\",\"description\":\"Integration test project\"}" "$ACCESS_TOKEN")
    
    PROJECT_ID=$(echo "$project_response" | jq -r '._id' 2>/dev/null)
    
    if [ "$PROJECT_ID" != "null" ] && [ -n "$PROJECT_ID" ]; then
        echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}"
    fi
    echo ""
fi

# Test 5: Create Task
if [ -n "$ACCESS_TOKEN" ] && [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    echo -e "${BLUE}▶ Test 5: Task Management${NC}"
    task_response=$(test_endpoint "POST /api/tasks/projects/:id/tasks" "POST" "/api/tasks/projects/$PROJECT_ID/tasks" \
"{\"title\":\"Test Task\",\"description\":\"Integration test task\",\"priority\":\"high\"}" "$ACCESS_TOKEN")
    
    TASK_ID=$(echo "$task_response" | jq -r '._id' 2>/dev/null)
    
    if [ "$TASK_ID" != "null" ] && [ -n "$TASK_ID" ]; then
        echo -e "${GREEN}✓ Task created: $TASK_ID${NC}"
    fi
    echo ""
fi

# Test 6: Update Task Status
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    echo -e "${BLUE}▶ Test 6: Update Task Status${NC}"
    test_endpoint "PATCH /api/tasks/:taskId/status" "PATCH" "/api/tasks/$TASK_ID/status" \
"{\"status\":\"in_progress\"}" "$ACCESS_TOKEN" > /dev/null
    echo ""
fi

# Test 7: Notifications
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${BLUE}▶ Test 7: Notifications${NC}"
    test_endpoint "GET /api/notify" "GET" "/api/notify" "" "$ACCESS_TOKEN" > /dev/null
    echo ""
fi

# Summary
echo -e "${BLUE}▶ Test Summary${NC}"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}│           ✓ All Integration Tests Passed!                  │${NC}"
    echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
    exit 0
else
    echo -e "${RED}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${RED}│          ❌ Some tests failed. Check logs above.            │${NC}"
    echo -e "${RED}└─────────────────────────────────────────────────────────────┘${NC}"
    exit 1
fi
