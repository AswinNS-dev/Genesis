import { apiRequest } from './api';

export interface EntityItem {
  id: string;
  name: string;
  type: string;
  aliases?: string;
  value?: string;
  phone?: string;
  vehicle?: string;
  location?: string;
  riskScore: number;
  caseId?: string;
  createdAt: string;
  dossier?: any;
}

export const entityService = {
  getEntities: async (type?: string, search?: string, caseId?: string): Promise<EntityItem[]> => {
    const params = new URLSearchParams();
    if (type && type !== 'ALL') params.append('type', type);
    if (search) params.append('search', search);
    if (caseId) params.append('caseId', caseId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<EntityItem[]>(`/entities${query}`);
  },

  getEntity: async (id: string): Promise<EntityItem> => {
    return apiRequest<EntityItem>(`/entities/${id}`);
  },

  createEntity: async (data: Partial<EntityItem>): Promise<EntityItem> => {
    return apiRequest<EntityItem>('/entities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEntity: async (id: string, data: Partial<EntityItem>): Promise<EntityItem> => {
    return apiRequest<EntityItem>(`/entities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
