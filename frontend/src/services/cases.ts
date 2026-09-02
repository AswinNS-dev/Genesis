import { apiRequest } from './api';
import { Case } from '../types';

export const caseService = {
  list: (status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return apiRequest<Case[]>(`/cases?${params.toString()}`);
  },
  create: (data: Partial<Case>) =>
    apiRequest<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addNote: (caseId: string, body: string) =>
    apiRequest(`/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};
