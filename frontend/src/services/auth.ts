import { apiRequest, setStoredToken, getStoredToken } from './api';
import { User } from '../types';

export interface DemoUserItem {
  id: string;
  email: string;
  name: string;
  role: 'VIEWER' | 'ANALYST' | 'INVESTIGATOR' | 'ADMIN';
  roleTitle: string;
  description: string;
  defaultPassword?: string;
  status: string;
}

export interface DemoUsersResponse {
  source: string;
  count: number;
  demoUsers: DemoUserItem[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  getDemoUsers: () => apiRequest<DemoUsersResponse>('/auth/demo-users'),

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res?.access_token) {
      setStoredToken(res.access_token);
      try {
        localStorage.setItem('crimeintel_user', JSON.stringify(res.user));
      } catch (err) {
        console.error('Failed to store user cache:', err);
      }
    }
    return res;
  },

  logout: async () => {
    try {
      await apiRequest<{ message: string }>('/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    } finally {
      setStoredToken(null);
      try {
        localStorage.removeItem('crimeintel_user');
      } catch {}
    }
  },

  getMe: () => apiRequest<User>('/auth/me'),

  getStoredUser: (): User | null => {
    try {
      const u = localStorage.getItem('crimeintel_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  getStoredToken,
};
