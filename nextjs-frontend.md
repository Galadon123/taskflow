# TaskFlow - Next.js 14 Frontend

A full-featured project and task management frontend built with Next.js 14 App Router, TypeScript, and Tailwind CSS. Connects to the TaskFlow API Gateway at `http://localhost:8080`.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [File Structure](#file-structure)
4. [package.json](#packagejson)
5. [TypeScript Types](#typescript-types)
6. [Environment Variables](#environment-variables)
7. [next.config.js](#nextconfigjs)
8. [tailwind.config.ts](#tailwindconfigts)
9. [lib/api.ts](#libapits)
10. [lib/auth.ts](#libauthts)
11. [middleware.ts](#middlewarets)
12. [app/layout.tsx](#applayouttsx)
13. [app/page.tsx](#apppagetsx)
14. [app/api/auth/[...route]/route.ts](#appapiauthrouteroute-ts)
15. [app/(auth)/login/page.tsx](#appauthloginpagetsx)
16. [app/(auth)/register/page.tsx](#appAuthregisterpagetsx)
17. [app/(dashboard)/layout.tsx](#appdashboardlayouttsx)
18. [app/(dashboard)/projects/page.tsx](#appdashboardprojectspagetsx)
19. [app/(dashboard)/projects/[id]/page.tsx](#appdashboardprojectsidpagetsx)
20. [components/Navbar.tsx](#componentsnavbartsx)
21. [components/TaskCard.tsx](#componentstaskCardtsx)
22. [components/modals/CreateProjectModal.tsx](#componentsmodalscreateprojectmodaltsx)
23. [components/modals/CreateTaskModal.tsx](#componentsmodalscreatetaskmodaltsx)
24. [Dockerfile](#dockerfile)
25. [Running the Application](#running-the-application)

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** 9+ or **pnpm** 8+
- TaskFlow API Gateway running at `http://localhost:8080`

---

## Project Overview

TaskFlow frontend is a Next.js 14 application using the App Router. It provides:

- **Authentication** - Login and Register with JWT stored in `httpOnly` cookies (set via Next.js API routes for SSR safety)
- **Projects** - Full CRUD: list, create, update, delete
- **Tasks** - Full CRUD per project; assign tasks to users; update status (`todo`, `in_progress`, `done`) with a Kanban board view
- **Notifications** - Bell icon in navbar showing unread count; mark individual or all as read

### Architecture Decisions

| Concern | Approach |
|---|---|
| JWT storage | `httpOnly` cookie set by `/api/auth/*` route handlers |
| Server data fetching | React Server Components + `fetch()` with `cache` / `next.revalidate` |
| Client interactivity | `'use client'` components with `axios` or `fetch` |
| Route protection | `middleware.ts` checks cookie presence and redirects |
| Styling | Tailwind CSS v3 |
| Type safety | TypeScript throughout |

---

## File Structure

```
taskflow-frontend/
├── app/
│   ├── layout.tsx                        # Root layout (Providers, fonts)
│   ├── page.tsx                          # Root redirect
│   ├── globals.css
│   ├── api/
│   │   └── auth/
│   │       └── [...route]/
│   │           └── route.ts             # Login, register, logout token handlers
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   └── (dashboard)/
│       ├── layout.tsx                   # Dashboard shell with Navbar
│       ├── projects/
│       │   ├── page.tsx                 # Server Component: project list
│       │   └── [id]/
│       │       └── page.tsx             # Server Component: kanban board
│       └── notifications/
│           └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── TaskCard.tsx
│   ├── KanbanColumn.tsx
│   ├── NotificationBell.tsx
│   └── modals/
│       ├── CreateProjectModal.tsx
│       ├── EditProjectModal.tsx
│       ├── CreateTaskModal.tsx
│       └── EditTaskModal.tsx
├── lib/
│   ├── api.ts                           # fetch wrapper with auth headers
│   └── auth.ts                          # JWT utilities (decode, expiry check)
├── hooks/
│   ├── useProjects.ts
│   ├── useTasks.ts
│   └── useNotifications.ts
├── types/
│   └── index.ts
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
└── Dockerfile
```

---

## package.json

```json
{
  "name": "taskflow-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "axios": "^1.7.2",
    "clsx": "^2.1.1",
    "jose": "^5.3.0",
    "lucide-react": "^0.383.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.3",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5"
  }
}
```

---

## TypeScript Types

**`types/index.ts`**

```typescript
// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
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

export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
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
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  assignee?: User;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'project_invite'
  | 'comment_added';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  userId: string;
  relatedProjectId?: string;
  relatedTaskId?: string;
  createdAt: string;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
```

---

## Environment Variables

**`.env.local`** (development)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
JWT_SECRET=your-jwt-secret-here
NODE_ENV=development
```

**`.env.production`**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
```

> `JWT_SECRET` is only used server-side to verify tokens in middleware and API routes. Never expose it to the client.

---

## next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Rewrite API calls from the browser through Next.js server to avoid CORS
  // in development. In production the Nginx gateway handles this.
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/gateway/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
          },
        ]
      : [];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  experimental: {
    // Opt specific server actions packages into server-only bundling
    serverComponentsExternalPackages: ['jose'],
  },
};

module.exports = nextConfig;
```

---

## tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## lib/api.ts

Server-safe fetch wrapper that reads the JWT from cookies (server context) or `Authorization` header (client context).

```typescript
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Server-side helper (Server Components / Route Handlers) ─────────────────

async function getServerToken(): Promise<string | undefined> {
  // cookies() is only available in Server Components and Route Handlers
  try {
    const cookieStore = cookies();
    return cookieStore.get('tf_token')?.value;
  } catch {
    return undefined;
  }
}

interface FetchOptions extends RequestInit {
  token?: string; // override token (e.g. from client)
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token: overrideToken, ...fetchInit } = options;

  const token = overrideToken ?? (await getServerToken());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchInit.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    headers,
  });

  if (!res.ok) {
    let body: { message?: string; errors?: Record<string, string[]> } = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON error body
    }
    throw new ApiError(
      res.status,
      body.message ?? `Request failed: ${res.status}`,
      body.errors
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: import('@/types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    }),

  register: (name: string, email: string, password: string) =>
    apiFetch<{ token: string; user: import('@/types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
      cache: 'no-store',
    }),

  me: (token?: string) =>
    apiFetch<import('@/types').User>('/auth/me', {
      cache: 'no-store',
      token,
    }),
};

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (token?: string) =>
    apiFetch<import('@/types').Project[]>('/projects', {
      next: { tags: ['projects'] },
      token,
    }),

  get: (id: string, token?: string) =>
    apiFetch<import('@/types').Project>(`/projects/${id}`, {
      next: { tags: [`project-${id}`] },
      token,
    }),

  create: (payload: import('@/types').CreateProjectPayload, token?: string) =>
    apiFetch<import('@/types').Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
      cache: 'no-store',
      token,
    }),

  update: (
    id: string,
    payload: import('@/types').UpdateProjectPayload,
    token?: string
  ) =>
    apiFetch<import('@/types').Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      cache: 'no-store',
      token,
    }),

  delete: (id: string, token?: string) =>
    apiFetch<void>(`/projects/${id}`, {
      method: 'DELETE',
      cache: 'no-store',
      token,
    }),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (projectId: string, token?: string) =>
    apiFetch<import('@/types').Task[]>(`/projects/${projectId}/tasks`, {
      next: { tags: [`tasks-${projectId}`] },
      token,
    }),

  get: (projectId: string, taskId: string, token?: string) =>
    apiFetch<import('@/types').Task>(`/projects/${projectId}/tasks/${taskId}`, {
      next: { tags: [`task-${taskId}`] },
      token,
    }),

  create: (
    projectId: string,
    payload: import('@/types').CreateTaskPayload,
    token?: string
  ) =>
    apiFetch<import('@/types').Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
      cache: 'no-store',
      token,
    }),

  update: (
    projectId: string,
    taskId: string,
    payload: import('@/types').UpdateTaskPayload,
    token?: string
  ) =>
    apiFetch<import('@/types').Task>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      cache: 'no-store',
      token,
    }),

  delete: (projectId: string, taskId: string, token?: string) =>
    apiFetch<void>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
      cache: 'no-store',
      token,
    }),
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (token?: string) =>
    apiFetch<import('@/types').Notification[]>('/notifications', {
      next: { tags: ['notifications'] },
      token,
    }),

  markRead: (id: string, token?: string) =>
    apiFetch<import('@/types').Notification>(`/notifications/${id}/read`, {
      method: 'PATCH',
      cache: 'no-store',
      token,
    }),

  markAllRead: (token?: string) =>
    apiFetch<void>('/notifications/read-all', {
      method: 'PATCH',
      cache: 'no-store',
      token,
    }),
};
```

---

## lib/auth.ts

JWT decode utilities (runs only on the server or in middleware — never ships raw to the browser).

```typescript
import { jwtVerify, SignJWT } from 'jose';
import type { User } from '@/types';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret'
);

export interface TokenPayload {
  sub: string;       // user id
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Verify a JWT and return its payload.
 * Throws if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as TokenPayload;
}

/**
 * Decode a JWT without verifying the signature.
 * Safe for reading claims client-side (non-sensitive UI only).
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is expired (or malformed).
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Extract user-like object from a decoded token.
 */
export function tokenToUser(token: string): Partial<User> | null {
  const payload = decodeToken(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}
```

---

## middleware.ts

Protects all dashboard routes. Redirects unauthenticated users to `/login` and authenticated users away from auth pages.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/projects', '/notifications', '/dashboard'];

// Routes that should NOT be accessible when authenticated
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('tf_token')?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // Validate token
  let isValidToken = false;
  if (token) {
    try {
      await verifyToken(token);
      isValidToken = true;
    } catch {
      // expired or invalid — treat as logged out
    }
  }

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !isValidToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isValidToken) {
    return NextResponse.redirect(new URL('/projects', request.url));
  }

  // Clear invalid/expired cookie
  if (token && !isValidToken) {
    const response = NextResponse.next();
    response.cookies.delete('tf_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## app/layout.tsx

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'TaskFlow',
    template: '%s | TaskFlow',
  },
  description: 'Project and task management for teams',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

---

## app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-inter: 'Inter', sans-serif;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

---

## app/page.tsx

```typescript
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

/**
 * Root page: redirect to /projects if authenticated, else /login.
 */
export default async function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('tf_token')?.value;

  if (token) {
    try {
      await verifyToken(token);
      redirect('/projects');
    } catch {
      redirect('/login');
    }
  }

  redirect('/login');
}
```

---

## app/api/auth/[...route]/route.ts

Handles login, register, and logout by setting/clearing the `httpOnly` cookie.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authApi } from '@/lib/api';
import { ApiError } from '@/lib/api';

const COOKIE_NAME = 'tf_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

async function handleLogin(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const data = await authApi.login(email, password);

    const response = NextResponse.json(
      { user: data.user },
      { status: 200 }
    );
    response.cookies.set(COOKIE_NAME, data.token, COOKIE_OPTIONS);
    return response;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { message: err.message },
        { status: err.statusCode }
      );
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

async function handleRegister(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const data = await authApi.register(name, email, password);

    const response = NextResponse.json(
      { user: data.user },
      { status: 201 }
    );
    response.cookies.set(COOKIE_NAME, data.token, COOKIE_OPTIONS);
    return response;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { message: err.message },
        { status: err.statusCode }
      );
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

function handleLogout() {
  const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const action = params.route[0];

  switch (action) {
    case 'login':
      return handleLogin(req);
    case 'register':
      return handleRegister(req);
    case 'logout':
      return handleLogout();
    default:
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
}
```

---

## app/(auth)/layout.tsx

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-700">TaskFlow</h1>
          <p className="mt-1 text-sm text-gray-500">
            Project management for teams
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

---

## app/(auth)/login/page.tsx

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/projects';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Login failed');
        return;
      }

      router.push(callbackUrl);
      router.refresh(); // force server components to re-render with new cookie
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white px-8 py-10 shadow-lg">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">Sign in</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
```

---

## app/(auth)/register/page.tsx

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Registration failed');
        return;
      }

      router.push('/projects');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white px-8 py-10 shadow-lg">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">
        Create account
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

---

## app/(dashboard)/layout.tsx

```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { notificationsApi } from '@/lib/api';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('tf_token')?.value;

  if (!token) redirect('/login');

  let userPayload;
  try {
    userPayload = await verifyToken(token);
  } catch {
    redirect('/login');
  }

  // Fetch unread notification count for the bell icon (non-blocking)
  let unreadCount = 0;
  try {
    const notifications = await notificationsApi.list(token);
    unreadCount = notifications.filter((n) => !n.read).length;
  } catch {
    // notifications are non-critical — ignore errors
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        userName={userPayload.name}
        userEmail={userPayload.email}
        unreadCount={unreadCount}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
```

---

## app/(dashboard)/projects/page.tsx

Server Component — fetches projects on the server and renders them.

```typescript
import { cookies } from 'next/headers';
import { projectsApi } from '@/lib/api';
import Link from 'next/link';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import { FolderOpen, Plus } from 'lucide-react';

export const metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('tf_token')?.value ?? '';

  const projects = await projectsApi.list(token);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CreateProjectModal />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No projects yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-brand-300"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">
                  {project.name}
                </h2>
                <span
                  className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : project.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                {project.description || 'No description'}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>{project.taskCount ?? 0} tasks</span>
                <span>
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## app/(dashboard)/projects/[id]/page.tsx

Kanban board — Server Component fetches project + tasks, Client Components handle drag/drop and mutations.

```typescript
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { projectsApi, tasksApi } from '@/lib/api';
import { ApiError } from '@/lib/api';
import KanbanColumn from '@/components/KanbanColumn';
import CreateTaskModal from '@/components/modals/CreateTaskModal';
import type { TaskStatus } from '@/types';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  return { title: `Project ${params.id}` };
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-yellow-50' },
  { status: 'done', label: 'Done', color: 'bg-green-50' },
];

export default async function ProjectDetailPage({ params }: Props) {
  const cookieStore = cookies();
  const token = cookieStore.get('tf_token')?.value ?? '';

  let project;
  try {
    project = await projectsApi.get(params.id, token);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound();
    throw err;
  }

  const tasks = await tasksApi.list(params.id, token);

  const tasksByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = tasks.filter((t) => t.status === col.status);
      return acc;
    },
    {} as Record<TaskStatus, typeof tasks>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-gray-500">{project.description}</p>
          )}
        </div>
        <CreateTaskModal projectId={params.id} />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUMNS.map(({ status, label, color }) => (
          <KanbanColumn
            key={status}
            projectId={params.id}
            status={status}
            label={label}
            colorClass={color}
            tasks={tasksByStatus[status]}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## components/Navbar.tsx

```typescript
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  userName: string;
  userEmail: string;
  unreadCount: number;
}

export default function Navbar({ userName, userEmail, unreadCount }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/projects" className="text-xl font-bold text-brand-600">
          TaskFlow
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/projects"
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            Projects
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <NotificationBell unreadCount={unreadCount} />

          {/* User menu */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 sm:block">
              {userName}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
```

---

## components/NotificationBell.tsx

```typescript
'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface NotificationBellProps {
  unreadCount: number;
}

export default function NotificationBell({ unreadCount }: NotificationBellProps) {
  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      aria-label={`Notifications (${unreadCount} unread)`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
```

---

## components/TaskCard.tsx

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, TaskStatus } from '@/types';
import { User, Calendar, Flag } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  projectId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskCard({ task, projectId }: TaskCardProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function updateStatus(newStatus: TaskStatus) {
    if (newStatus === task.status) return;
    setUpdating(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      router.refresh();
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setUpdating(false);
    }
  }

  async function deleteTask() {
    if (!confirm(`Delete task "${task.title}"?`)) return;

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/tasks/${task.id}`,
        { method: 'DELETE', credentials: 'include' }
      );
      router.refresh();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Title & priority */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">{task.title}</h3>
        <Flag
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            PRIORITY_COLORS[task.priority] ?? 'text-gray-400'
          }`}
        />
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">
          {task.description}
        </p>
      )}

      {/* Metadata row */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        {task.assignee && (
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {task.assignee.name}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Status selector */}
      <div className="mt-3 flex items-center justify-between">
        <select
          value={task.status}
          onChange={(e) => updateStatus(e.target.value as TaskStatus)}
          disabled={updating}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={deleteTask}
          className="hidden rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 group-hover:block transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

---

## components/KanbanColumn.tsx

```typescript
import type { Task, TaskStatus } from '@/types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  projectId: string;
  status: TaskStatus;
  label: string;
  colorClass: string;
  tasks: Task[];
}

export default function KanbanColumn({
  projectId,
  status,
  label,
  colorClass,
  tasks,
}: KanbanColumnProps) {
  return (
    <div className={`rounded-2xl ${colorClass} p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500 shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} projectId={projectId} />
        ))}

        {tasks.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-xs text-gray-400">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## components/modals/CreateProjectModal.tsx

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

export default function CreateProjectModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setOpen(false);
    setName('');
    setDescription('');
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim() }),
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? 'Failed to create project');
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                New Project
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="My awesome project"
                />
              </div>

              <div>
                <label
                  htmlFor="projectDesc"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="projectDesc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  placeholder="What is this project about?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## components/modals/CreateTaskModal.tsx

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '@/types';

interface CreateTaskModalProps {
  projectId: string;
}

export default function CreateTaskModal({ projectId }: CreateTaskModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setOpen(false);
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setDueDate('');
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        ...(dueDate ? { dueDate } : {}),
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? 'Failed to create task');
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                New Task
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="taskTitle"
                  className="block text-sm font-medium text-gray-700"
                >
                  Title
                </label>
                <input
                  id="taskTitle"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Implement login page"
                />
              </div>

              <div>
                <label
                  htmlFor="taskDesc"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="taskDesc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="taskStatus"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="taskStatus"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="taskPriority"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Priority
                  </label>
                  <select
                    id="taskPriority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="taskDue"
                  className="block text-sm font-medium text-gray-700"
                >
                  Due date{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="taskDue"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## app/(dashboard)/notifications/page.tsx

```typescript
import { cookies } from 'next/headers';
import { notificationsApi } from '@/lib/api';
import NotificationsClient from './NotificationsClient';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('tf_token')?.value ?? '';

  const notifications = await notificationsApi.list(token);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Notifications</h1>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
```

**`app/(dashboard)/notifications/NotificationsClient.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/types';
import { Bell, CheckCheck } from 'lucide-react';

interface Props {
  initialNotifications: Notification[];
}

const TYPE_LABELS: Record<string, string> = {
  task_assigned: 'Task assigned',
  task_status_changed: 'Status changed',
  project_invite: 'Project invite',
  comment_added: 'New comment',
};

export default function NotificationsClient({ initialNotifications }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [loading, setLoading] = useState<string | null>(null);

  const unread = notifications.filter((n) => !n.read);

  async function markRead(id: string) {
    setLoading(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      router.refresh(); // update bell count in layout
    } finally {
      setLoading(null);
    }
  }

  async function markAllRead() {
    setLoading('all');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-2xl">
      {unread.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={markAllRead}
            disabled={loading === 'all'}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <Bell className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">All caught up!</p>
          <p className="mt-1 text-sm text-gray-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${
                n.read
                  ? 'border-gray-100 bg-white'
                  : 'border-brand-100 bg-brand-50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {n.title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>

              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  disabled={loading === n.id}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 disabled:opacity-50 transition-colors"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Dockerfile

Multi-stage build using `output: 'standalone'` for a minimal production image.

```dockerfile
# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become env vars at build time only
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# next build uses output: 'standalone' (set in next.config.js)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone output already includes required node_modules
COPY --from=builder /app/public       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by Next.js standalone output
CMD ["node", "server.js"]
```

---

## Running the Application

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# App available at http://localhost:3000
```

### Production (standalone)

```bash
npm run build
node .next/standalone/server.js
```

### Docker

```bash
# Build the image
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 \
  -t taskflow-frontend:latest \
  .

# Run the container
docker run \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8080 \
  -e JWT_SECRET=your-jwt-secret \
  taskflow-frontend:latest
```

### Docker Compose (with API Gateway)

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: ./taskflow-frontend
      args:
        NEXT_PUBLIC_API_URL: http://nginx:8080
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://nginx:8080
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - nginx
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "8080:8080"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## Key Implementation Notes

### Cookie-based JWT flow

1. User submits login form (client component)
2. Browser calls `POST /api/auth/login` (Next.js Route Handler)
3. Route Handler calls backend API, receives JWT
4. Route Handler sets `httpOnly` cookie `tf_token` on the response
5. Subsequent Server Component renders read the cookie via `cookies()` from `next/headers`
6. `middleware.ts` reads the same cookie for every request to protected routes

### Server vs Client component split

| Component | Type | Reason |
|---|---|---|
| `app/(dashboard)/projects/page.tsx` | Server | Fetches project list at render time |
| `app/(dashboard)/projects/[id]/page.tsx` | Server | Fetches tasks at render time |
| `components/TaskCard.tsx` | Client | Needs `onChange` handler for status updates |
| `components/Navbar.tsx` | Client | Needs logout button click handler |
| `components/modals/*` | Client | Form state and submission |
| `app/(auth)/login/page.tsx` | Client | Form state |

### Revalidation

Server Components use `next: { tags: ['projects'] }` fetch options. After mutations in client components, call `router.refresh()` to trigger a re-render of Server Components using the same tag. For more granular invalidation in server actions, use `revalidateTag('projects')`.
