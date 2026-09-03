import { apiRequest } from './api';

export interface VisualizationsData {
  kpis: {
    totalCases: number;
    totalEntities: number;
    totalCommunications: number;
    totalTransactions: number;
    activeCases: number;
    solvedCases: number;
    evidenceDocuments: number;
    registeredVehicles: number;
    locationEvents: number;
    filteredCount: number;
  };
  crimeTrend: Array<{
    period: string;
    total: number;
    solved: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  districtAnalysis: Array<{
    district: string;
    count: number;
    percentage: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  networkInsight: {
    totalNodes: number;
    totalEdges: number;
    topConnected: Array<{
      id: string;
      name: string;
      type: string;
      connections: number;
    }>;
  };
  insights: string[];
  recentIncidents: Array<{
    caseNumber: string;
    crimeType: string;
    location: string;
    time: string;
    status: string;
    officer: string;
  }>;
  filterOptions: {
    districts: string[];
    categories: string[];
    statuses: string[];
  };
  dataSource: string;
}

export interface NetworkExplorerNode {
  id: string;
  label: string;
  type: string;
  riskScore: number;
  degree?: number;
  betweenness?: number;
  closeness?: number;
  pageRank?: number;
  community?: string;
  phone?: string;
  vehicle?: string;
  location?: string;
  caseId?: string;
  crimeType?: string;
  jurisdiction?: string;
  date?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface NetworkExplorerEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  supportingRecord?: string;
  supportingDetail?: string;
  date?: string;
}

export interface NetworkCommunity {
  id: string;
  name: string;
  memberCount: number;
  edgeCount: number;
  dominantType: string;
  memberIds: string[];
  topMembers: string[];
}

export interface NetworkLinkAnalysisItem {
  type: string;
  count: number;
  percentage: number;
}

export interface NetworkTimelineItem {
  id: string;
  entityId: string;
  entityName: string;
  type: string;
  date: string;
  title: string;
  detail: string;
}

export interface NetworkExplorerData {
  nodes: NetworkExplorerNode[];
  edges: NetworkExplorerEdge[];
  totalNodes: number;
  totalEdges: number;
  communities?: NetworkCommunity[];
  linkAnalysis?: NetworkLinkAnalysisItem[];
  timeline?: NetworkTimelineItem[];
  topHubs?: NetworkExplorerNode[];
  topBridges?: NetworkExplorerNode[];
  filterOptions?: {
    crimeTypes: string[];
    districts: string[];
    policeStations: string[];
  };
  scope: string;
  timestamp: string;
}

export const visualizationsService = {
  getVisualizations: async (filters?: {
    district?: string;
    category?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<VisualizationsData> => {
    const params = new URLSearchParams();
    if (filters?.district && filters.district !== 'All Districts') params.append('district', filters.district);
    if (filters?.category && filters.category !== 'All Categories') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'All Statuses') params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<VisualizationsData>(`/analytics/visualizations${query}`);
  },

  getNetworkExplorer: async (filters?: {
    search?: string;
    crime_type?: string;
    district?: string;
    police_station?: string;
    entity_type?: string;
    min_risk?: number;
    date_from?: string;
    date_to?: string;
    focus_id?: string;
    hops?: number;
    limit?: number;
  }): Promise<NetworkExplorerData> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.crime_type && filters.crime_type !== 'All Crime Types') params.append('crime_type', filters.crime_type);
    if (filters?.district && filters.district !== 'All Districts') params.append('district', filters.district);
    if (filters?.police_station && filters.police_station !== 'All Police Stations') params.append('police_station', filters.police_station);
    if (filters?.entity_type && filters.entity_type !== 'All Categories') params.append('entity_type', filters.entity_type);
    if (filters?.min_risk !== undefined && filters.min_risk > 0) params.append('min_risk', filters.min_risk.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.focus_id) params.append('focus_id', filters.focus_id);
    if (filters?.hops) params.append('hops', filters.hops.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<NetworkExplorerData>(`/analysis/network-explorer${query}`);
  }
};
