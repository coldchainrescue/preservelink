import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: 'https://preservelink-backend.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// FIX: Only trigger logout when a real user-initiated request gets a 401.
// Background endpoints (/auth/me, /analytics/track, /notifications) fail
// silently — we never log the user out because of those.
const SILENT_ENDPOINTS = ['/auth/me', '/analytics/track', '/notifications'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isSilent = SILENT_ENDPOINTS.some((ep) => originalRequest?.url?.includes(ep));

    if (error.response?.status === 401 && !originalRequest._retry && !isSilent) {
      originalRequest._retry = true;
      try {
        await useAuthStore.getState().refreshTokens();
        const newToken = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
