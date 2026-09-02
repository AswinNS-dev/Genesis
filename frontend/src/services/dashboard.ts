import { apiRequest } from './api';

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  timestamp: string;
  source: string;
}

export interface HotspotItem {
  location: string;
  detail: string;
  status: 'ANOMALOUS' | 'REVIEW' | 'NORMAL';
}

export interface DashboardSummary {
  total_cases: number;
  active_cases: number;
  total_entities: number;
  communications: number;
  transactions: number;
  vehicles: number;
  criminal_records: number;
  location_events: number;
  evidence_documents: number;
  entity_aliases: number;
  recent_activities?: ActivityItem[];
  hotspots?: HotspotItem[];
  ai_analyses?: number;
  pending_matches?: number;
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    return apiRequest<DashboardSummary>('/dashboard/summary');
  },
};
