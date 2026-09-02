import { apiRequest } from './api';

export const analysisService = {
  summarizeCase: (caseId: string) => apiRequest<any>(`/analysis/case/${caseId}`, { method: 'POST' }),
  getGraph: () => apiRequest<{ nodes: any[]; links: any[] }>('/analysis/graph'),
  findPath: (source: string, target: string) => apiRequest<any[]>(`/analysis/path?source=${source}&target=${target}`),
};
