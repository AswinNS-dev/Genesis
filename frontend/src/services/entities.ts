import { apiRequest } from './api';
import { Entity } from '../types';

export const entityService = {
  list: (type?: string, search?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    return apiRequest<Entity[]>(`/entities?${params.toString()}`);
  },
  create: (data: Partial<Entity>) =>
    apiRequest<Entity>('/entities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
