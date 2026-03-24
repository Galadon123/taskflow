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
    list: () => api.get("/api/tasks/projects"),
    get: (id) => api.get(`/api/tasks/projects/${id}`),
    create: (data) => api.post("/api/tasks/projects", data),
    update: (id, data) => api.put(`/api/tasks/projects/${id}`, data),
    delete: (id) => api.delete(`/api/tasks/projects/${id}`),
};

// Tasks endpoints
export const tasksAPI = {
    list: (projectId) => api.get(`/api/tasks/projects/${projectId}/tasks`),
    get: (taskId) => api.get(`/api/tasks/${taskId}`),
    create: (projectId, data) => api.post(`/api/tasks/projects/${projectId}/tasks`, data),
    update: (taskId, data) => api.put(`/api/tasks/${taskId}`, data),
    updateStatus: (taskId, status) => api.patch(`/api/tasks/${taskId}/status`, { status }),
    assign: (taskId, assigneeId) => api.post(`/api/tasks/${taskId}/assign`, { assignee_id: assigneeId }),
    delete: (taskId) => api.delete(`/api/tasks/${taskId}`),
};

// Notifications endpoints
export const notificationsAPI = {
    list: () => api.get("/api/notify/"),
    markAsRead: (id) => api.patch(`/api/notify/${id}/read`),
    markAllAsRead: () => api.patch(`/api/notify/read-all`),
    delete: (id) => api.delete(`/api/notify/${id}`),
    getUnreadCount: () => api.get("/api/notify/unread-count"),
};

export default api;
