import { apiRequest } from './api';
import { User } from '../types';

export const authService = {
  login: (email: string, password: string) =>
    apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest<User>('/auth/me'),
};
