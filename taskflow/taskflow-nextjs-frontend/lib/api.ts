import axios from 'axios';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token from cookies if available
api.interceptors.request.use(async (config) => {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired, redirect will be handled by middleware
        }
        return Promise.reject(error);
    }
);

export default api;
