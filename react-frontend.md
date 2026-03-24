# TaskFlow React Frontend

A modern React 18 frontend for the TaskFlow project management application. Built with Vite, Tailwind CSS, and React Router v6. Communicates with the TaskFlow API Gateway at `http://localhost:8080`.

---

## Prerequisites

- Node.js 18+
- npm or yarn
- TaskFlow backend services running (API Gateway at `http://localhost:8080`)

---

## Project Overview

| Feature | Details |
|---|---|
| Framework | React 18 + Vite |
| Routing | react-router-dom v6 |
| HTTP Client | axios with JWT interceptors |
| Styling | Tailwind CSS |
| Auth | JWT stored in localStorage |
| Container | Docker (multi-stage build) |

---

## File Structure

```
taskflow-frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── api/
│   │   └── axios.js
│   ├── components/
│   │   ├── CreateProjectModal.jsx
│   │   ├── CreateTaskModal.jsx
│   │   ├── Navbar.jsx
│   │   └── TaskCard.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── DashboardPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ProjectPage.jsx
│   │   └── RegisterPage.jsx
│   ├── App.jsx
│   └── main.jsx
├── Dockerfile
├── nginx.conf
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## package.json

```json
{
  "name": "taskflow-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.0"
  }
}
```

---

## tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};
```

---

## vite.config.js

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

---

## src/main.jsx

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

> Create `src/index.css` with Tailwind directives:
>
> ```css
> @tailwind base;
> @tailwind components;
> @tailwind utilities;
> ```

---

## src/App.jsx

```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import Navbar from "./components/Navbar";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { token } = useAuth();
  return !token ? children : <Navigate to="/dashboard" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <PrivateRoute>
                <AppLayout>
                  <ProjectPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## src/api/axios.js

```js
import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 by redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post("/api/auth/login", credentials),
  register: (userData) => api.post("/api/auth/register", userData),
  me: () => api.get("/api/auth/me"),
};

// Projects endpoints
export const projectsAPI = {
  list: () => api.get("/api/projects"),
  get: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post("/api/projects", data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  delete: (id) => api.delete(`/api/projects/${id}`),
};

// Tasks endpoints
export const tasksAPI = {
  list: (projectId) => api.get(`/api/projects/${projectId}/tasks`),
  get: (projectId, taskId) =>
    api.get(`/api/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, data) =>
    api.post(`/api/projects/${projectId}/tasks`, data),
  update: (projectId, taskId, data) =>
    api.put(`/api/projects/${projectId}/tasks/${taskId}`, data),
  delete: (projectId, taskId) =>
    api.delete(`/api/projects/${projectId}/tasks/${taskId}`),
  updateStatus: (projectId, taskId, status) =>
    api.patch(`/api/projects/${projectId}/tasks/${taskId}/status`, { status }),
  assign: (projectId, taskId, userId) =>
    api.patch(`/api/projects/${projectId}/tasks/${taskId}/assign`, {
      assigned_to: userId,
    }),
};

// Notifications endpoints
export const notificationsAPI = {
  list: () => api.get("/api/notifications"),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch("/api/notifications/read-all"),
};

export default api;
```

---

## src/context/AuthContext.jsx

```jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authAPI } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Verify stored token on mount
  useEffect(() => {
    const verify = async () => {
      if (token) {
        try {
          const { data } = await authAPI.me();
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
        } catch {
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };
    verify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { token: jwt, user: userData } = data;
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    const { token: jwt, user: userData } = data;
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

---

## src/pages/LoginPage.jsx

```jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TaskFlow</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## src/pages/RegisterPage.jsx

```jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TaskFlow</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Jane Doe"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Min. 6 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              required
              placeholder="Repeat password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## src/pages/DashboardPage.jsx

```jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { projectsAPI } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import CreateProjectModal from "../components/CreateProjectModal";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await projectsAPI.list();
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      await projectsAPI.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete project.");
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditProject(null);
    fetchProjects();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || "there"}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> New Project
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No projects yet
          </h2>
          <p className="text-gray-400 mb-6">
            Create your first project to get started.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  {project.name}
                </h2>
                <div
                  className="flex gap-1 opacity-0 group-hover:opacity-100 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditProject(project);
                      setShowModal(true);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {project.description && (
                <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-50">
                <span>
                  Created{" "}
                  {new Date(project.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                  View tasks
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateProjectModal
          project={editProject}
          onClose={() => {
            setShowModal(false);
            setEditProject(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
```

---

## src/pages/ProjectPage.jsx

```jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsAPI, tasksAPI } from "../api/axios";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";

const STATUS_COLUMNS = [
  { key: "todo", label: "To Do", color: "bg-gray-100 text-gray-700" },
  { key: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  { key: "done", label: "Done", color: "bg-green-100 text-green-700" },
];

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes] = await Promise.all([
        projectsAPI.get(projectId),
        tasksAPI.list(projectId),
      ]);
      setProject(projRes.data);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data.tasks || []);
    } catch (err) {
      if (err.response?.status === 404) {
        navigate("/dashboard");
      } else {
        setError("Failed to load project data.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateStatus(projectId, taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch {
      alert("Failed to update task status.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await tasksAPI.delete(projectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      alert("Failed to delete task.");
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditTask(null);
    fetchData();
  };

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-gray-600 transition text-sm flex items-center gap-1"
        >
          ← Back
        </button>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
          {project?.description && (
            <p className="text-gray-500 text-sm mt-1">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add Task
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUS_COLUMNS.map((col) => (
          <div key={col.key} className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.color}`}>
                {col.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {tasksByStatus(col.key).length}
              </span>
            </div>
            <div className="p-3 space-y-3 min-h-[200px]">
              {tasksByStatus(col.key).length === 0 ? (
                <p className="text-center text-gray-300 text-sm py-8">No tasks</p>
              ) : (
                tasksByStatus(col.key).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onEdit={() => {
                      setEditTask(task);
                      setShowModal(true);
                    }}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <CreateTaskModal
          projectId={projectId}
          task={editTask}
          onClose={() => {
            setShowModal(false);
            setEditTask(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
```

---

## src/components/Navbar.jsx

```jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsAPI } from "../api/axios";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifs(true);
      const { data } = await notificationsAPI.list();
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch {
      // Silently fail for notifications
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      alert("Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      alert("Failed to mark all notifications as read.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="text-xl font-bold text-blue-600 tracking-tight"
          >
            TaskFlow
          </Link>

          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications((v) => !v);
                  if (!showNotifications) fetchNotifications();
                }}
                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition focus:outline-none"
                title="Notifications"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-900 text-sm">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {loadingNotifs ? (
                      <div className="text-center py-8 text-sm text-gray-400">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-400">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.read && handleMarkRead(notif.id)}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${
                            !notif.read ? "bg-blue-50" : ""
                          }`}
                        >
                          <p className="text-sm text-gray-800">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                          {!notif.read && (
                            <span className="inline-block mt-1 text-xs text-blue-600 font-medium">
                              Click to mark as read
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

---

## src/components/TaskCard.jsx

```jsx
const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function TaskCard({ task, onStatusChange, onEdit, onDelete }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3.5 hover:shadow-sm transition group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900 leading-snug">
          {task.title}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition text-xs"
            title="Edit task"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition text-xs"
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {task.priority && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
            }`}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        )}

        {task.assigned_to_name && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-semibold text-xs">
              {task.assigned_to_name.charAt(0).toUpperCase()}
            </span>
            {task.assigned_to_name}
          </span>
        )}
      </div>

      {task.due_date && (
        <p className="text-xs text-gray-400 mt-2">
          Due:{" "}
          {new Date(task.due_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <label className="text-xs text-gray-500 font-medium block mb-1">
          Status
        </label>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

---

## src/components/CreateProjectModal.jsx

```jsx
import { useState, useEffect } from "react";
import { projectsAPI } from "../api/axios";

export default function CreateProjectModal({ project, onClose, onSaved }) {
  const isEdit = !!project;
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setForm({ name: project.name || "", description: project.description || "" });
    }
  }, [project]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isEdit) {
        await projectsAPI.update(project.id, form);
      } else {
        await projectsAPI.create(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Project" : "New Project"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Website Redesign"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of the project..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 py-2.5 text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## src/components/CreateTaskModal.jsx

```jsx
import { useState, useEffect } from "react";
import { tasksAPI } from "../api/axios";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function CreateTaskModal({ projectId, task, onClose, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        assigned_to: task.assigned_to || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
      });
    }
  }, [task]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
      };
      if (isEdit) {
        await tasksAPI.update(projectId, task.id, payload);
      } else {
        await tasksAPI.create(projectId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="What needs to be done?"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Add details about this task..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To (User ID)
            </label>
            <input
              type="text"
              name="assigned_to"
              value={form.assigned_to}
              onChange={handleChange}
              placeholder="Enter user ID to assign"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 py-2.5 text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## Dockerfile

Multi-stage build: Node builds the app, Nginx serves the static files.

```dockerfile
# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:stable-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## nginx.conf

SPA-friendly config: all unmatched routes fall back to `index.html` for client-side routing.

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Proxy API requests to the backend gateway
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback: serve index.html for all other routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

---

## Setup & Running

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev
```

> The Vite dev server proxies `/api/*` to `http://localhost:8080`, so no CORS issues during development.

### Production Build

```bash
npm run build
# Output in ./dist/
```

### Docker

```bash
# Build image
docker build -t taskflow-frontend .

# Run container
docker run -p 80:80 taskflow-frontend
```

> The Nginx container serves the app on port 80. Update the `proxy_pass` in `nginx.conf` to point to your actual API Gateway host when deploying in Docker Compose or Kubernetes.

---

## API Contract Summary

The frontend expects the following response shapes from the API Gateway at `http://localhost:8080`:

| Endpoint | Method | Request Body | Response |
|---|---|---|---|
| `/api/auth/login` | POST | `{ email, password }` | `{ token, user }` |
| `/api/auth/register` | POST | `{ name, email, password }` | `{ token, user }` |
| `/api/auth/me` | GET | — | `{ id, name, email }` |
| `/api/projects` | GET | — | `[{ id, name, description, created_at }]` |
| `/api/projects` | POST | `{ name, description }` | `{ id, name, ... }` |
| `/api/projects/:id` | PUT | `{ name, description }` | `{ id, name, ... }` |
| `/api/projects/:id` | DELETE | — | `204` |
| `/api/projects/:id/tasks` | GET | — | `[{ id, title, description, status, priority, assigned_to, assigned_to_name, due_date }]` |
| `/api/projects/:id/tasks` | POST | `{ title, description, status, priority, assigned_to, due_date }` | `{ id, title, ... }` |
| `/api/projects/:id/tasks/:tid` | PUT | (same as POST) | `{ id, title, ... }` |
| `/api/projects/:id/tasks/:tid` | DELETE | — | `204` |
| `/api/projects/:id/tasks/:tid/status` | PATCH | `{ status }` | `{ id, status, ... }` |
| `/api/projects/:id/tasks/:tid/assign` | PATCH | `{ assigned_to }` | `{ id, assigned_to, ... }` |
| `/api/notifications` | GET | — | `[{ id, message, read, created_at }]` |
| `/api/notifications/:id/read` | PATCH | — | `{ id, read: true }` |
| `/api/notifications/read-all` | PATCH | — | `204` |
