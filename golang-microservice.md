# TaskFlow — Go + Gin Microservice Implementation

A production-ready microservice architecture for the TaskFlow project using Go 1.21+, Gin, and multiple databases.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [File Structure](#file-structure)
4. [Auth Service (Port 4001)](#auth-service-port-4001)
5. [Task Service (Port 4002)](#task-service-port-4002)
6. [Notification Service (Port 4003)](#notification-service-port-4003)
7. [Curl Test Commands](#curl-test-commands)

---

## Project Overview

TaskFlow is a task management platform built as three independent microservices:

| Service             | Port | Database   | Responsibility                        |
|---------------------|------|------------|---------------------------------------|
| Auth Service        | 4001 | PostgreSQL | User registration, login, JWT tokens  |
| Task Service        | 4002 | MongoDB    | Projects and task CRUD                |
| Notification Service| 4003 | MySQL      | In-app notifications                  |

---

## Prerequisites

- Go 1.21 or later
- Docker and Docker Compose (for databases)
- PostgreSQL 15+, MongoDB 6+, MySQL 8+

---

## File Structure

```
taskflow/
├── auth-service/
│   ├── go.mod
│   ├── go.sum
│   ├── main.go
│   ├── Dockerfile
│   ├── .env
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   └── postgres.go
│   ├── models/
│   │   └── user.go
│   ├── handlers/
│   │   └── auth.go
│   ├── middleware/
│   │   └── auth.go
│   └── routes/
│       └── routes.go
│
├── task-service/
│   ├── go.mod
│   ├── go.sum
│   ├── main.go
│   ├── Dockerfile
│   ├── .env
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   └── mongo.go
│   ├── models/
│   │   ├── project.go
│   │   └── task.go
│   ├── handlers/
│   │   ├── project.go
│   │   └── task.go
│   ├── middleware/
│   │   └── auth.go
│   └── routes/
│       └── routes.go
│
└── notification-service/
    ├── go.mod
    ├── go.sum
    ├── main.go
    ├── Dockerfile
    ├── .env
    ├── config/
    │   └── config.go
    ├── database/
    │   └── mysql.go
    ├── models/
    │   └── notification.go
    ├── handlers/
    │   └── notification.go
    ├── middleware/
    │   └── auth.go
    └── routes/
        └── routes.go
```

---

## Auth Service (Port 4001)

### Environment Variables — `.env`

```env
PORT=4001
DATABASE_URL=postgresql://postgres:password@postgres:5432/taskflow_auth
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### `go.mod`

```go
module auth-service

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.2.1
    github.com/google/uuid v1.6.0
    github.com/jackc/pgx/v5 v5.5.5
    github.com/joho/godotenv v1.5.1
    golang.org/x/crypto v0.21.0
)
```

### `config/config.go`

```go
package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	JWTSecret              string
	JWTExpiresIn           time.Duration
	RefreshTokenExpiresIn  time.Duration
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	jwtExpires, err := time.ParseDuration(getEnv("JWT_EXPIRES_IN", "15m"))
	if err != nil {
		jwtExpires = 15 * time.Minute
	}

	refreshExpires, err := time.ParseDuration(getEnv("REFRESH_TOKEN_EXPIRES_IN", "168h"))
	if err != nil {
		refreshExpires = 7 * 24 * time.Hour
	}

	return &Config{
		Port:                  getEnv("PORT", "4001"),
		DatabaseURL:           getEnv("DATABASE_URL", ""),
		JWTSecret:             getEnv("JWT_SECRET", "secret"),
		JWTExpiresIn:          jwtExpires,
		RefreshTokenExpiresIn: refreshExpires,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
```

### `database/postgres.go`

```go
package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect(databaseURL string) {
	var err error
	Pool, err = pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}

	if err = Pool.Ping(context.Background()); err != nil {
		log.Fatalf("Cannot ping database: %v\n", err)
	}

	log.Println("Connected to PostgreSQL")
	migrate()
}

func migrate() {
	ctx := context.Background()

	_, err := Pool.Exec(ctx, `
		CREATE EXTENSION IF NOT EXISTS "pgcrypto";

		CREATE TABLE IF NOT EXISTS users (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name        TEXT NOT NULL,
			email       TEXT UNIQUE NOT NULL,
			password    TEXT NOT NULL,
			avatar      TEXT,
			role        TEXT NOT NULL DEFAULT 'member',
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS refresh_tokens (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token       TEXT NOT NULL UNIQUE,
			expires_at  TIMESTAMPTZ NOT NULL,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
		CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
	`)
	if err != nil {
		log.Fatalf("Migration failed: %v\n", err)
	}

	log.Println("Database migration complete")
}
```

### `models/user.go`

```go
package models

import "time"

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Avatar    *string   `json:"avatar"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type RegisterRequest struct {
	Name     string `json:"name"     binding:"required,min=2"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
	Name   string  `json:"name"`
	Avatar *string `json:"avatar"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         *User  `json:"user"`
}
```

### `middleware/auth.go`

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		tokenStr := parts[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
```

### `handlers/auth.go`

```go
package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"auth-service/database"
	"auth-service/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	JWTSecret             string
	JWTExpiresIn          time.Duration
	RefreshTokenExpiresIn time.Duration
}

type jwtClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (h *AuthHandler) generateAccessToken(user *models.User) (string, error) {
	claims := jwtClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(h.JWTExpiresIn)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.JWTSecret))
}

func generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// Register godoc
// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()

	// Check for existing user
	var exists bool
	err := database.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)`, req.Email).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var user models.User
	err = database.Pool.QueryRow(ctx,
		`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
		 RETURNING id, name, email, avatar, role, created_at, updated_at`,
		req.Name, req.Email, string(hashed),
	).Scan(&user.ID, &user.Name, &user.Email, &user.Avatar, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	accessToken, err := h.generateAccessToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := generateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	expiresAt := time.Now().Add(h.RefreshTokenExpiresIn)
	_, err = database.Pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
		user.ID, refreshToken, expiresAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store refresh token"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         &user,
	})
}

// Login godoc
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()

	var user models.User
	err := database.Pool.QueryRow(ctx,
		`SELECT id, name, email, password, avatar, role, created_at, updated_at FROM users WHERE email=$1`,
		req.Email,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Password, &user.Avatar, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	accessToken, err := h.generateAccessToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := generateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	expiresAt := time.Now().Add(h.RefreshTokenExpiresIn)
	_, err = database.Pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
		user.ID, refreshToken, expiresAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store refresh token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         &user,
	})
}

// GetMe godoc
// GET /api/auth/me
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetString("user_id")

	ctx := context.Background()
	var user models.User
	err := database.Pool.QueryRow(ctx,
		`SELECT id, name, email, avatar, role, created_at, updated_at FROM users WHERE id=$1`,
		userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Avatar, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// UpdateMe godoc
// PUT /api/auth/me
func (h *AuthHandler) UpdateMe(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	var user models.User
	err := database.Pool.QueryRow(ctx,
		`UPDATE users SET
			name       = COALESCE(NULLIF($1, ''), name),
			avatar     = COALESCE($2, avatar),
			updated_at = NOW()
		 WHERE id = $3
		 RETURNING id, name, email, avatar, role, created_at, updated_at`,
		req.Name, req.Avatar, userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Avatar, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// Logout godoc
// POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	// Best-effort bind; proceed even if body is missing
	_ = c.ShouldBindJSON(&body)

	if body.RefreshToken != "" {
		ctx := context.Background()
		_, _ = database.Pool.Exec(ctx,
			`DELETE FROM refresh_tokens WHERE token=$1`,
			body.RefreshToken,
		)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
```

### `routes/routes.go`

```go
package routes

import (
	"auth-service/handlers"
	"auth-service/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, h *handlers.AuthHandler, jwtSecret string) {
	api := r.Group("/api/auth")
	{
		api.POST("/register", h.Register)
		api.POST("/login", h.Login)
		api.POST("/logout", h.Logout)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtSecret))
		{
			protected.GET("/me", h.GetMe)
			protected.PUT("/me", h.UpdateMe)
		}
	}
}
```

### `main.go`

```go
package main

import (
	"log"

	"auth-service/config"
	"auth-service/database"
	"auth-service/handlers"
	"auth-service/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg.DatabaseURL)
	defer database.Pool.Close()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "auth"})
	})

	h := &handlers.AuthHandler{
		JWTSecret:             cfg.JWTSecret,
		JWTExpiresIn:          cfg.JWTExpiresIn,
		RefreshTokenExpiresIn: cfg.RefreshTokenExpiresIn,
	}

	routes.Setup(r, h, cfg.JWTSecret)

	log.Printf("Auth service listening on :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
```

### `Dockerfile`

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./main.go

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 4001
ENTRYPOINT ["./server"]
```

---

## Task Service (Port 4002)

### Environment Variables — `.env`

```env
PORT=4002
MONGO_URI=mongodb://mongo:27017/taskflow_tasks
AUTH_SERVICE_URL=http://auth-service:4001
```

### `go.mod`

```go
module task-service

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.2.1
    github.com/google/uuid v1.6.0
    github.com/joho/godotenv v1.5.1
    go.mongodb.org/mongo-driver v1.14.0
)
```

### `config/config.go`

```go
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	AuthServiceURL string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}
	return &Config{
		Port:           getEnv("PORT", "4002"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017/taskflow_tasks"),
		AuthServiceURL: getEnv("AUTH_SERVICE_URL", "http://localhost:4001"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

### `database/mongo.go`

```go
package database

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var DB *mongo.Database

func Connect(uri string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(uri)
	var err error
	Client, err = mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("MongoDB connection error: %v", err)
	}

	if err = Client.Ping(ctx, nil); err != nil {
		log.Fatalf("Cannot ping MongoDB: %v", err)
	}

	DB = Client.Database("taskflow_tasks")
	log.Println("Connected to MongoDB")
	createIndexes()
}

func createIndexes() {
	ctx := context.Background()

	// Projects collection indexes
	projectsColl := DB.Collection("projects")
	_, _ = projectsColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "owner_id", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
	})

	// Tasks collection indexes
	tasksColl := DB.Collection("tasks")
	_, _ = tasksColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "project_id", Value: 1}}},
		{Keys: bson.D{{Key: "assigned_to", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
	})

	log.Println("MongoDB indexes created")
}
```

### `models/project.go`

```go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Project struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"  json:"id"`
	Name        string             `bson:"name"           json:"name"`
	Description string             `bson:"description"    json:"description"`
	OwnerID     string             `bson:"owner_id"       json:"owner_id"`
	Members     []string           `bson:"members"        json:"members"`
	CreatedAt   time.Time          `bson:"created_at"     json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"     json:"updated_at"`
}

type CreateProjectRequest struct {
	Name        string   `json:"name"        binding:"required,min=1"`
	Description string   `json:"description"`
	Members     []string `json:"members"`
}

type UpdateProjectRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Members     []string `json:"members"`
}
```

### `models/task.go`

```go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Task struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"  json:"id"`
	ProjectID   primitive.ObjectID `bson:"project_id"     json:"project_id"`
	Title       string             `bson:"title"          json:"title"`
	Description string             `bson:"description"    json:"description"`
	Status      string             `bson:"status"         json:"status"`
	Priority    string             `bson:"priority"       json:"priority"`
	AssignedTo  *string            `bson:"assigned_to"    json:"assigned_to"`
	DueDate     *time.Time         `bson:"due_date"       json:"due_date"`
	CreatedBy   string             `bson:"created_by"     json:"created_by"`
	CreatedAt   time.Time          `bson:"created_at"     json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"     json:"updated_at"`
}

type CreateTaskRequest struct {
	Title       string     `json:"title"       binding:"required,min=1"`
	Description string     `json:"description"`
	Priority    string     `json:"priority"    binding:"oneof=low medium high"`
	AssignedTo  *string    `json:"assigned_to"`
	DueDate     *time.Time `json:"due_date"`
}

type UpdateTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Priority    string     `json:"priority"`
	AssignedTo  *string    `json:"assigned_to"`
	DueDate     *time.Time `json:"due_date"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=todo in_progress review done"`
}

type AssignTaskRequest struct {
	UserID string `json:"user_id" binding:"required"`
}
```

### `middleware/auth.go`

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// ValidateToken parses and validates a JWT, returning claims or an error.
// The task service shares the same secret as the auth service.
func ValidateToken(tokenStr, secret string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		claims, err := ValidateToken(parts[1], jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
```

### `handlers/project.go`

```go
package handlers

import (
	"context"
	"net/http"
	"time"

	"task-service/database"
	"task-service/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ListProjects godoc
// GET /api/tasks/projects
func ListProjects(c *gin.Context) {
	userID := c.GetString("user_id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"$or": bson.A{
			bson.M{"owner_id": userID},
			bson.M{"members": userID},
		},
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := database.DB.Collection("projects").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	defer cursor.Close(ctx)

	var projects []models.Project
	if err = cursor.All(ctx, &projects); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

// CreateProject godoc
// POST /api/tasks/projects
func CreateProject(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	project := models.Project{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
		Members:     req.Members,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if project.Members == nil {
		project.Members = []string{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := database.DB.Collection("projects").InsertOne(ctx, project)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"project": project})
}

// GetProject godoc
// GET /api/tasks/projects/:id
func GetProject(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var project models.Project
	if err = database.DB.Collection("projects").FindOne(ctx, bson.M{"_id": id}).Decode(&project); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"project": project})
}

// UpdateProject godoc
// PUT /api/tasks/projects/:id
func UpdateProject(c *gin.Context) {
	userID := c.GetString("user_id")
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req models.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{"$set": bson.M{"updated_at": time.Now()}}
	if req.Name != "" {
		update["$set"].(bson.M)["name"] = req.Name
	}
	if req.Description != "" {
		update["$set"].(bson.M)["description"] = req.Description
	}
	if req.Members != nil {
		update["$set"].(bson.M)["members"] = req.Members
	}

	filter := bson.M{"_id": id, "owner_id": userID}
	result, err := database.DB.Collection("projects").UpdateOne(ctx, filter, update)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found or access denied"})
		return
	}

	var project models.Project
	_ = database.DB.Collection("projects").FindOne(ctx, bson.M{"_id": id}).Decode(&project)
	c.JSON(http.StatusOK, gin.H{"project": project})
}

// DeleteProject godoc
// DELETE /api/tasks/projects/:id
func DeleteProject(c *gin.Context) {
	userID := c.GetString("user_id")
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.DB.Collection("projects").DeleteOne(ctx, bson.M{"_id": id, "owner_id": userID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found or access denied"})
		return
	}

	// Remove all tasks belonging to this project
	_, _ = database.DB.Collection("tasks").DeleteMany(ctx, bson.M{"project_id": id})

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted"})
}
```

### `handlers/task.go`

```go
package handlers

import (
	"context"
	"net/http"
	"time"

	"task-service/database"
	"task-service/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ListTasks godoc
// GET /api/tasks/projects/:id/tasks
func ListTasks(c *gin.Context) {
	projectID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := database.DB.Collection("tasks").Find(ctx, bson.M{"project_id": projectID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}
	defer cursor.Close(ctx)

	var tasks []models.Task
	if err = cursor.All(ctx, &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tasks": tasks})
}

// CreateTask godoc
// POST /api/tasks/projects/:id/tasks
func CreateTask(c *gin.Context) {
	userID := c.GetString("user_id")
	projectID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	task := models.Task{
		ID:          primitive.NewObjectID(),
		ProjectID:   projectID,
		Title:       req.Title,
		Description: req.Description,
		Status:      "todo",
		Priority:    req.Priority,
		AssignedTo:  req.AssignedTo,
		DueDate:     req.DueDate,
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if task.Priority == "" {
		task.Priority = "medium"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = database.DB.Collection("tasks").InsertOne(ctx, task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"task": task})
}

// GetTask godoc
// GET /api/tasks/:taskId
func GetTask(c *gin.Context) {
	taskID, err := primitive.ObjectIDFromHex(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var task models.Task
	if err = database.DB.Collection("tasks").FindOne(ctx, bson.M{"_id": taskID}).Decode(&task); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"task": task})
}

// UpdateTask godoc
// PUT /api/tasks/:taskId
func UpdateTask(c *gin.Context) {
	taskID, err := primitive.ObjectIDFromHex(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req models.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	setFields := bson.M{"updated_at": time.Now()}
	if req.Title != "" {
		setFields["title"] = req.Title
	}
	if req.Description != "" {
		setFields["description"] = req.Description
	}
	if req.Priority != "" {
		setFields["priority"] = req.Priority
	}
	if req.AssignedTo != nil {
		setFields["assigned_to"] = req.AssignedTo
	}
	if req.DueDate != nil {
		setFields["due_date"] = req.DueDate
	}

	result, err := database.DB.Collection("tasks").UpdateOne(ctx, bson.M{"_id": taskID}, bson.M{"$set": setFields})
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var task models.Task
	_ = database.DB.Collection("tasks").FindOne(ctx, bson.M{"_id": taskID}).Decode(&task)
	c.JSON(http.StatusOK, gin.H{"task": task})
}

// DeleteTask godoc
// DELETE /api/tasks/:taskId
func DeleteTask(c *gin.Context) {
	taskID, err := primitive.ObjectIDFromHex(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.DB.Collection("tasks").DeleteOne(ctx, bson.M{"_id": taskID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

// UpdateTaskStatus godoc
// PATCH /api/tasks/:taskId/status
func UpdateTaskStatus(c *gin.Context) {
	taskID, err := primitive.ObjectIDFromHex(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req models.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.DB.Collection("tasks").UpdateOne(ctx,
		bson.M{"_id": taskID},
		bson.M{"$set": bson.M{"status": req.Status, "updated_at": time.Now()}},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var task models.Task
	_ = database.DB.Collection("tasks").FindOne(ctx, bson.M{"_id": taskID}).Decode(&task)
	c.JSON(http.StatusOK, gin.H{"task": task})
}

// AssignTask godoc
// POST /api/tasks/:taskId/assign
func AssignTask(c *gin.Context) {
	taskID, err := primitive.ObjectIDFromHex(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req models.AssignTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.DB.Collection("tasks").UpdateOne(ctx,
		bson.M{"_id": taskID},
		bson.M{"$set": bson.M{"assigned_to": req.UserID, "updated_at": time.Now()}},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var task models.Task
	_ = database.DB.Collection("tasks").FindOne(ctx, bson.M{"_id": taskID}).Decode(&task)
	c.JSON(http.StatusOK, gin.H{"task": task})
}
```

### `routes/routes.go`

```go
package routes

import (
	"task-service/handlers"
	"task-service/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, jwtSecret string) {
	api := r.Group("/api/tasks")
	api.Use(middleware.AuthMiddleware(jwtSecret))
	{
		// Project routes
		api.GET("/projects", handlers.ListProjects)
		api.POST("/projects", handlers.CreateProject)
		api.GET("/projects/:id", handlers.GetProject)
		api.PUT("/projects/:id", handlers.UpdateProject)
		api.DELETE("/projects/:id", handlers.DeleteProject)

		// Task routes scoped to a project
		api.GET("/projects/:id/tasks", handlers.ListTasks)
		api.POST("/projects/:id/tasks", handlers.CreateTask)

		// Standalone task routes
		api.GET("/:taskId", handlers.GetTask)
		api.PUT("/:taskId", handlers.UpdateTask)
		api.DELETE("/:taskId", handlers.DeleteTask)
		api.PATCH("/:taskId/status", handlers.UpdateTaskStatus)
		api.POST("/:taskId/assign", handlers.AssignTask)
	}
}
```

### `main.go`

```go
package main

import (
	"log"
	"os"

	"task-service/config"
	"task-service/database"
	"task-service/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg.MongoURI)
	defer func() {
		if err := database.Client.Disconnect(nil); err != nil {
			log.Printf("Error disconnecting MongoDB: %v", err)
		}
	}()

	// The task service validates tokens using the same JWT secret.
	// Pass via JWT_SECRET env var (shared secret or public key).
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key"
	}

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "task"})
	})

	routes.Setup(r, jwtSecret)

	log.Printf("Task service listening on :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
```

### `Dockerfile`

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./main.go

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 4002
ENTRYPOINT ["./server"]
```

---

## Notification Service (Port 4003)

### Environment Variables — `.env`

```env
PORT=4003
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=taskflow_notify
TASK_SERVICE_URL=http://task-service:4002
JWT_SECRET=your-super-secret-jwt-key
```

### `go.mod`

```go
module notification-service

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/go-sql-driver/mysql v1.7.1
    github.com/golang-jwt/jwt/v5 v5.2.1
    github.com/google/uuid v1.6.0
    github.com/joho/godotenv v1.5.1
)
```

### `config/config.go`

```go
package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MySQLDSN       string
	TaskServiceURL string
	JWTSecret      string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
		getEnv("MYSQL_USER", "root"),
		getEnv("MYSQL_PASSWORD", "password"),
		getEnv("MYSQL_HOST", "localhost"),
		getEnv("MYSQL_PORT", "3306"),
		getEnv("MYSQL_DATABASE", "taskflow_notify"),
	)

	return &Config{
		Port:           getEnv("PORT", "4003"),
		MySQLDSN:       dsn,
		TaskServiceURL: getEnv("TASK_SERVICE_URL", "http://localhost:4002"),
		JWTSecret:      getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

### `database/mysql.go`

```go
package database

import (
	"database/sql"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func Connect(dsn string) {
	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to open MySQL connection: %v", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(10)

	if err = DB.Ping(); err != nil {
		log.Fatalf("Cannot ping MySQL: %v", err)
	}

	log.Println("Connected to MySQL")
	migrate()
}

func migrate() {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS notifications (
			id          VARCHAR(36)  PRIMARY KEY,
			user_id     VARCHAR(36)  NOT NULL,
			title       VARCHAR(255) NOT NULL,
			message     TEXT         NOT NULL,
			type        VARCHAR(50)  NOT NULL DEFAULT 'info',
			is_read     TINYINT(1)   NOT NULL DEFAULT 0,
			ref_id      VARCHAR(36),
			ref_type    VARCHAR(50),
			created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_user_id  (user_id),
			INDEX idx_is_read  (is_read),
			INDEX idx_created  (created_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
	`)
	if err != nil {
		log.Fatalf("MySQL migration failed: %v", err)
	}
	log.Println("MySQL migration complete")
}
```

### `models/notification.go`

```go
package models

import "time"

type Notification struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	Type      string     `json:"type"`
	IsRead    bool       `json:"is_read"`
	RefID     *string    `json:"ref_id"`
	RefType   *string    `json:"ref_type"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CreateNotificationRequest struct {
	UserID  string  `json:"user_id"  binding:"required"`
	Title   string  `json:"title"    binding:"required"`
	Message string  `json:"message"  binding:"required"`
	Type    string  `json:"type"`
	RefID   *string `json:"ref_id"`
	RefType *string `json:"ref_type"`
}
```

### `middleware/auth.go`

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(parts[1], claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
```

### `handlers/notification.go`

```go
package handlers

import (
	"net/http"
	"time"

	"notification-service/database"
	"notification-service/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ListNotifications godoc
// GET /api/notify
func ListNotifications(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := database.DB.Query(`
		SELECT id, user_id, title, message, type, is_read, ref_id, ref_type, created_at, updated_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT 100
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		var isRead int
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.Type, &isRead, &n.RefID, &n.RefType, &n.CreatedAt, &n.UpdatedAt); err != nil {
			continue
		}
		n.IsRead = isRead == 1
		notifications = append(notifications, n)
	}

	if notifications == nil {
		notifications = []models.Notification{}
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

// MarkAsRead godoc
// PATCH /api/notify/:id/read
func MarkAsRead(c *gin.Context) {
	userID := c.GetString("user_id")
	notifID := c.Param("id")

	result, err := database.DB.Exec(`
		UPDATE notifications SET is_read = 1, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, time.Now(), notifID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// MarkAllAsRead godoc
// PATCH /api/notify/read-all
func MarkAllAsRead(c *gin.Context) {
	userID := c.GetString("user_id")

	_, err := database.DB.Exec(`
		UPDATE notifications SET is_read = 1, updated_at = ?
		WHERE user_id = ? AND is_read = 0
	`, time.Now(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// DeleteNotification godoc
// DELETE /api/notify/:id
func DeleteNotification(c *gin.Context) {
	userID := c.GetString("user_id")
	notifID := c.Param("id")

	result, err := database.DB.Exec(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, notifID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

// CreateNotification is an internal endpoint (called by other services).
// POST /api/notify/internal
func CreateNotification(c *gin.Context) {
	var req models.CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Type == "" {
		req.Type = "info"
	}

	id := uuid.New().String()
	now := time.Now()

	_, err := database.DB.Exec(`
		INSERT INTO notifications (id, user_id, title, message, type, ref_id, ref_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, req.UserID, req.Title, req.Message, req.Type, req.RefID, req.RefType, now, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Notification created"})
}
```

### `routes/routes.go`

```go
package routes

import (
	"notification-service/handlers"
	"notification-service/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, jwtSecret string) {
	// Internal endpoint — no auth required (called service-to-service)
	r.POST("/api/notify/internal", handlers.CreateNotification)

	api := r.Group("/api/notify")
	api.Use(middleware.AuthMiddleware(jwtSecret))
	{
		api.GET("", handlers.ListNotifications)
		api.PATCH("/:id/read", handlers.MarkAsRead)
		api.PATCH("/read-all", handlers.MarkAllAsRead)
		api.DELETE("/:id", handlers.DeleteNotification)
	}
}
```

### `main.go`

```go
package main

import (
	"log"

	"notification-service/config"
	"notification-service/database"
	"notification-service/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg.MySQLDSN)
	defer database.DB.Close()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "notification"})
	})

	routes.Setup(r, cfg.JWTSecret)

	log.Printf("Notification service listening on :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
```

### `Dockerfile`

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./main.go

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 4003
ENTRYPOINT ["./server"]
```

---

## Curl Test Commands

Set a variable with your token after login for convenience:

```bash
TOKEN="<paste_your_access_token_here>"
```

### Auth Service (port 4001)

**Register**
```bash
curl -s -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Smith","email":"alice@example.com","password":"secret123"}' | jq
```

**Login**
```bash
curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq
```

**Get current user**
```bash
curl -s http://localhost:4001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Update profile**
```bash
curl -s -X PUT http://localhost:4001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Johnson","avatar":"https://example.com/avatar.png"}' | jq
```

**Logout**
```bash
curl -s -X POST http://localhost:4001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<your_refresh_token>"}' | jq
```

---

### Task Service (port 4002)

**Create a project**
```bash
curl -s -X POST http://localhost:4002/api/tasks/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Redesign","description":"Redesign the company website","members":[]}' | jq
```

**List projects**
```bash
curl -s http://localhost:4002/api/tasks/projects \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Get a project**
```bash
PROJECT_ID="<project_object_id>"
curl -s http://localhost:4002/api/tasks/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Update a project**
```bash
curl -s -X PUT http://localhost:4002/api/tasks/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Redesign v2"}' | jq
```

**Delete a project**
```bash
curl -s -X DELETE http://localhost:4002/api/tasks/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Create a task**
```bash
curl -s -X POST http://localhost:4002/api/tasks/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Design landing page","description":"Create wireframes","priority":"high"}' | jq
```

**List tasks for a project**
```bash
curl -s http://localhost:4002/api/tasks/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Get a task**
```bash
TASK_ID="<task_object_id>"
curl -s http://localhost:4002/api/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Update a task**
```bash
curl -s -X PUT http://localhost:4002/api/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Design landing page - revised","priority":"medium"}' | jq
```

**Update task status**
```bash
curl -s -X PATCH http://localhost:4002/api/tasks/$TASK_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | jq
```

**Assign a task**
```bash
curl -s -X POST http://localhost:4002/api/tasks/$TASK_ID/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<user_uuid>"}' | jq
```

**Delete a task**
```bash
curl -s -X DELETE http://localhost:4002/api/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### Notification Service (port 4003)

**List notifications**
```bash
curl -s http://localhost:4003/api/notify \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Mark one notification as read**
```bash
NOTIF_ID="<notification_uuid>"
curl -s -X PATCH http://localhost:4003/api/notify/$NOTIF_ID/read \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Mark all notifications as read**
```bash
curl -s -X PATCH http://localhost:4003/api/notify/read-all \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Delete a notification**
```bash
curl -s -X DELETE http://localhost:4003/api/notify/$NOTIF_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Create a notification (internal service-to-service call)**
```bash
curl -s -X POST http://localhost:4003/api/notify/internal \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<user_uuid>",
    "title": "Task assigned",
    "message": "You have been assigned to Design landing page",
    "type": "task_assigned",
    "ref_id": "<task_object_id>",
    "ref_type": "task"
  }' | jq
```

---

## Health Checks

```bash
curl -s http://localhost:4001/health | jq
curl -s http://localhost:4002/health | jq
curl -s http://localhost:4003/health | jq
```
