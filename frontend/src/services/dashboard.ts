import { apiRequest } from './api';

export interface DashboardSummary {
  total_cases: number;
  active_cases: number;
  total_entities: number;
  evidence_items: number;
  ai_analyses: number;
  pending_matches: number;
  alerts: number;
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    return apiRequest<DashboardSummary>('/dashboard/summary');
  },
};
