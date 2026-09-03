import { apiRequest } from './api';

export interface StateHierarchyItem {
  name: string;
  latitude: number;
  longitude: number;
  districtCount: number;
  districts: string[];
}

export interface GeographicHierarchyResponse {
  country: string;
  center: [number, number];
  zoom: number;
  states: StateHierarchyItem[];
  allDistricts: string[];
  areasByDistrict: Record<string, string[]>;
}

export interface HotspotPoint {
  latitude: number;
  longitude: number;
  intensity: number; // 0.0 - 1.0
  weight: number;
  label: string;
}

export interface ClusterMarker {
  id: string;
  level: 'state' | 'district' | 'area';
  title: string;
  subtitle: string;
  state: string | null;
  district: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  activityCount: number;
  activityScore: number; // 0 - 100
  intensity: number; // 0.0 - 1.0
  sourceCount: number;
  flaggedCount: number;
  recentEvents?: Array<{
    type: string;
    source: string;
    subject: string;
    timestamp: string;
    flagged: boolean;
  }>;
  drillDownTarget: {
    level: string;
    state?: string;
    district?: string;
    area?: string;
  };
}

export interface DataQualityMetrics {
  recordsAnalyzed: number;
  recordsWithLocation: number;
  recordsMissingLocation: number;
  missingLocationPct: number;
  coveragePercent: number;
  sourceCount: number;
  sourcesList: string[];
  dataCompleteness: number;
  scope: {
    level: string;
    state: string;
    district: string;
    category: string;
  };
  attribution: string;
}

export interface IncidentComparisonMeta {
  has_incident_date: boolean;
  incident_date: string | null;
  window_days: number;
  window_start: string | null;
  window_end: string | null;
  case_id: string | null;
  case_number?: string;
  crime_type?: string;
  message: string | null;
}

export interface HotspotsResponse {
  level: 'india' | 'state' | 'district' | 'area';
  filters: {
    state: string | null;
    district: string | null;
    area: string | null;
    category: string;
    timeRange: string;
    dateFrom: string | null;
    dateTo: string | null;
    caseId: string | null;
    incidentWindow: number;
  };
  incidentComparison: IncidentComparisonMeta;
  center: [number, number];
  zoom: number;
  hotspots: HotspotPoint[];
  clusters: ClusterMarker[];
  dataQuality: DataQualityMetrics;
  explanation: string;
}

export interface CaseIncidentOption {
  id: string;
  caseNumber: string;
  title: string;
  crimeType: string;
  incidentDate: string | null;
  hasIncidentDate: boolean;
  jurisdiction: string;
  status: string;
}

export const locationService = {
  getHierarchy: async (): Promise<GeographicHierarchyResponse> => {
    return apiRequest<GeographicHierarchyResponse>('/locations/hierarchy');
  },

  getCasesWithIncidents: async (limit: number = 100): Promise<CaseIncidentOption[]> => {
    return apiRequest<CaseIncidentOption[]>(`/locations/cases-with-incidents?limit=${limit}`);
  },

  getHotspots: async (params: {
    level?: string;
    state?: string;
    district?: string;
    area?: string;
    category?: string;
    timeRange?: string;
    dateFrom?: string;
    dateTo?: string;
    caseId?: string;
    incidentWindow?: number;
  }): Promise<HotspotsResponse> => {
    const q = new URLSearchParams();
    if (params.level) q.append('level', params.level);
    if (params.state) q.append('state', params.state);
    if (params.district) q.append('district', params.district);
    if (params.area) q.append('area', params.area);
    if (params.category) q.append('category', params.category);
    if (params.timeRange) q.append('time_range', params.timeRange);
    if (params.dateFrom) q.append('date_from', params.dateFrom);
    if (params.dateTo) q.append('date_to', params.dateTo);
    if (params.caseId) q.append('case_id', params.caseId);
    if (params.incidentWindow) q.append('incident_window', params.incidentWindow.toString());

    return apiRequest<HotspotsResponse>(`/locations/hotspots?${q.toString()}`);
  }
};
