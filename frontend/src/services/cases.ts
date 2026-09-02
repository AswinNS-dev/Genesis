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
  durationSec: number;
  timestamp: string;
  cellTower?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface TransactionItem {
  id: string;
  sender: string;
  receiver: string;
  senderAccount?: string;
  receiverAccount?: string;
  amount: number;
  currency: string;
  transactionType: string;
  timestamp: string;
  isSuspicious: boolean;
  suspiciousReason?: string;
}

export interface LocationItem {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  subjectName?: string;
  timestamp: string;
  sourceType: string;
  speedKmh: number;
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
    return apiRequest<Case>(`/cases/${id}`);
  },

  createCase: async (data: Partial<Case>): Promise<Case> => {
    return apiRequest<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCase: async (id: string, data: Partial<Case>): Promise<Case> => {
    return apiRequest<Case>(`/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getSummary: async (caseId: string): Promise<CaseSummaryResponse> => {
    return apiRequest<CaseSummaryResponse>(`/cases/${caseId}/summary`);
  },

  getNetwork: async (caseId: string): Promise<CaseNetworkResponse> => {
    return apiRequest<CaseNetworkResponse>(`/cases/${caseId}/network`);
  },

  getTimeline: async (caseId: string): Promise<TimelineEventItem[]> => {
    return apiRequest<TimelineEventItem[]>(`/cases/${caseId}/timeline`);
  },

  getCommunications: async (caseId: string): Promise<CommunicationItem[]> => {
    return apiRequest<CommunicationItem[]>(`/cases/${caseId}/communications`);
  },

  getTransactions: async (caseId: string): Promise<TransactionItem[]> => {
    return apiRequest<TransactionItem[]>(`/cases/${caseId}/transactions`);
  },

  getLocations: async (caseId: string): Promise<LocationItem[]> => {
    return apiRequest<LocationItem[]>(`/cases/${caseId}/locations`);
  },
};
