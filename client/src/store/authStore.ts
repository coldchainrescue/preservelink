import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  workingPlace: string;
  rphNumber: string;
  role: 'user' | 'admin' | 'true_admin';
  verificationStatus: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ requiresTwoFactor?: boolean; email?: string }>;
  register: (data: FormData) => Promise<{ requiresTwoFactor?: boolean; email?: string }>;
  verify2FA: (email: string, code: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  updateSettings: (data: any) => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, rememberMe = false) => {
        const { data } = await api.post('/auth/login', { email, password, rememberMe });
        if (data.requiresTwoFactor) {
          return { requiresTwoFactor: true, email: data.email };
        }
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
        return {};
      },

      register: async (formData) => {
        const { data } = await api.post('/auth/register', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data.requiresTwoFactor) {
          return { requiresTwoFactor: true, email: data.email };
        }
        if (data.user) {
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          });
        }
        return {};
      },

      verify2FA: async (email, code, rememberMe = false) => {
        const { data } = await api.post('/auth/verify-2fa', { email, code, rememberMe });
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        api.post('/auth/logout').catch(() => {});
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await api.post('/auth/refresh', { refreshToken });
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      },

      updateSettings: async (settingsData) => {
        await api.put('/auth/settings', settingsData);
        if (settingsData.workingPlace) {
          const user = get().user;
          if (user) {
            set({ user: { ...user, workingPlace: settingsData.workingPlace } });
          }
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'preservelink-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
