// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    role?: string;
    createdAt?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken?: string;
    user: User;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'archived';

export interface Project {
    _id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    owner_id: string;
    members?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface CreateProjectPayload {
    name: string;
    description?: string;
}

export interface UpdateProjectPayload {
    name?: string;
    description?: string;
    status?: ProjectStatus;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
    _id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    project_id: string;
    assignee_id?: string;
    assignee?: User;
    due_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateTaskPayload {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string;
    due_date?: string;
}

export interface UpdateTaskPayload {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string;
    due_date?: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
    | 'task_assigned'
    | 'task_updated'
    | 'task_completed'
    | 'project_invite';

export interface Notification {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    user_id: string;
    data?: any;
    created_at: string;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

export interface ApiError {
    error: string;
}
