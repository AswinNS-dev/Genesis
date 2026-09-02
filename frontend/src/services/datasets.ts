import { apiRequest } from './api';

export const datasetService = {
  list: (caseId?: string) => {
    const params = caseId ? `?caseId=${caseId}` : '';
    return apiRequest<any[]>(`/datasets${params}`);
  },
};

export const reportService = {
  generate: (caseId: string) => apiRequest<any>(`/reports?caseId=${caseId}`),
};
