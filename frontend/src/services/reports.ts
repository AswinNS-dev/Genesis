import { apiRequest } from './api';

export const reportService = {
  generate: (caseId: string) => apiRequest<any>(`/reports?caseId=${caseId}`),
};
