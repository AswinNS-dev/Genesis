import { apiRequest } from './api';

export interface Case {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  status: string;
  classification: string;
  category?: string;
  jurisdiction?: string;
  assignedInvestigator?: string;
  createdAt: string;
  updatedAt: string;
  entityCount?: number;
  documentCount?: number;
  accusedName?: string;
  victimName?: string;
  policeStation?: string;
  courtName?: string;
  ipcSections?: string;
  courtStatus?: string;
  bailStatus?: string;
  riskScore?: number;
}

export interface CaseSummaryResponse {
  case: {
    id: string;
    caseId: string;
    title: string;
    description?: string;
    status: string;
    classification: string;
    category?: string;
    assignedInvestigator?: string;
    createdAt?: string;
  };
  statistics: {
    entities: number;
    relationships: number;
    timeline_events: number;
    communications: number;
    transactions: number;
    locations: number;
    evidence: number;
    analyses: number;
    notes: number;
  };
}

export interface CaseNetworkResponse {
  nodes: Array<{ id: string; label: string; type: string; riskScore: number }>;
  edges: Array<{ id: string; source: string; target: string; type: string; label?: string; strength: number }>;
}

export interface TimelineEventItem {
  id: string;
  type: string;
  summary: string;
  detail?: string;
  eventAt: string;
  createdAt: string;
}

export interface CommunicationItem {
  id: string;
  caller: string;
  receiver: string;
  callerName?: string;
  receiverName?: string;
  type: string;
  durationSec?: number;
  duration?: string;
  timestamp: string;
  cellTower?: string;
  location?: string;
  isAnomaly?: boolean;
  flagged?: boolean;
}

export interface TransactionItem {
  id: string;
  sender: string;
  receiver: string;
  senderAccount?: string;
  receiverAccount?: string;
  amount: number;
  currency?: string;
  transactionType?: string;
  type?: string;
  timestamp: string;
  isSuspicious?: boolean;
  suspicious?: boolean;
}

export interface LocationItem {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  subjectName?: string;
  timestamp?: string;
  firstSeen?: string;
  lastSeen?: string;
  sourceType?: string;
  type?: string;
  activityCount?: number;
}

export const caseService = {
  getCases: async (status?: string, search?: string): Promise<Case[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Case[]>(`/cases${query}`);
  },

  getCase: async (id: string): Promise<Case> => {
    return apiRequest<Case>(`/cases/${encodeURIComponent(id)}`);
  },

  createCase: async (data: Partial<Case>): Promise<Case> => {
    return apiRequest<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCase: async (id: string, data: Partial<Case>): Promise<Case> => {
    return apiRequest<Case>(`/cases/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getSummary: async (caseId: string): Promise<CaseSummaryResponse> => {
    return apiRequest<CaseSummaryResponse>(`/cases/${encodeURIComponent(caseId)}/summary`);
  },

  getNetwork: async (caseId: string): Promise<CaseNetworkResponse> => {
    return apiRequest<CaseNetworkResponse>(`/cases/${encodeURIComponent(caseId)}/network`);
  },

  getTimeline: async (caseId: string): Promise<TimelineEventItem[]> => {
    return apiRequest<TimelineEventItem[]>(`/cases/${encodeURIComponent(caseId)}/timeline`);
  },

  getCommunications: async (caseId: string): Promise<CommunicationItem[]> => {
    return apiRequest<CommunicationItem[]>(`/cases/${encodeURIComponent(caseId)}/communications`);
  },

  getTransactions: async (caseId: string): Promise<TransactionItem[]> => {
    return apiRequest<TransactionItem[]>(`/cases/${encodeURIComponent(caseId)}/transactions`);
  },

  getLocations: async (caseId: string): Promise<LocationItem[]> => {
    return apiRequest<LocationItem[]>(`/cases/${encodeURIComponent(caseId)}/locations`);
  },
};
