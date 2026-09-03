import { apiRequest } from './api';

export interface ReportCaseOption {
  id: string;
  caseId: string;
  title: string;
  status: string;
  category?: string;
}

export interface GeneratedReport {
  reportId: string;
  generatedAt: string;
  dataSource: string;
  case: {
    id?: string;
    caseId: string;
    title: string;
    description?: string;
    status: string;
    classification?: string;
    category?: string;
    jurisdiction?: string;
    assignedInvestigator?: string;
    createdAt?: string;
    accusedName?: string;
    victimName?: string;
    policeStation?: string;
    courtName?: string;
    ipcSections?: string;
    courtStatus?: string;
    bailStatus?: string;
    riskScore?: number;
  };
  summaryMetrics: {
    entityCount: number;
    relationshipCount: number;
    evidenceCount: number;
    timelineEventCount: number;
    communicationCount: number;
    transactionCount: number;
    locationCount: number;
    analysisCount: number;
    entityMatchCount: number;
    blockchainIntegrity: string;
  };
  entities: Array<{
    id: string;
    name: string;
    type: string;
    value?: string;
    aliases?: string;
    riskScore: number;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    label?: string;
    strength: number;
  }>;
  timeline: Array<{
    id?: string;
    type: string;
    summary: string;
    detail?: string;
    eventAt?: string;
    timestamp?: string;
  }>;
  communications: Array<{
    id?: string;
    caller: string;
    receiver: string;
    callerName?: string;
    receiverName?: string;
    duration?: string;
    durationSec?: number;
    timestamp: string;
    type?: string;
    location?: string;
    isAnomaly?: boolean;
    flagged?: boolean;
  }>;
  transactions: Array<{
    id?: string;
    sender: string;
    receiver: string;
    amount: number;
    currency?: string;
    timestamp: string;
    type?: string;
    isSuspicious?: boolean;
    suspicious?: boolean;
  }>;
  locations: Array<{
    id?: string;
    name: string;
    address?: string;
    coordinates?: string;
    latitude?: number;
    longitude?: number;
    sourceType?: string;
    type?: string;
  }>;
  evidence: Array<{
    id: string;
    name: string;
    description?: string;
    contentType?: string;
    sha256?: string;
    verified?: boolean;
    status?: string;
  }>;
  aiAnalysis: Array<{
    id: string;
    type: string;
    modelName?: string;
    confidence: number;
    explanation?: string;
    result?: any;
    createdAt?: string;
  }>;
  entityMatches: Array<{
    id: string;
    entityA: { id: string; name: string };
    entityB: { id: string; name: string };
    confidence: number;
    reasons?: string;
    status: string;
    createdAt?: string;
  }>;
  blockchainIntegrity: {
    intact: boolean;
    brokenIndex?: number | null;
    totalBlocks?: number;
  };
  auditTrail: Array<{
    id: string;
    action: string;
    detail?: string;
    status: string;
    severity?: string;
    createdAt?: string;
  }>;
  disclaimer: string;
}

export interface EntityDossier {
  dossierId: string;
  generatedAt: string;
  dataSource: string;
  identity: {
    id: string;
    primaryName: string;
    type: string;
    value?: string;
    aliases?: string;
    riskScore: number;
    phone?: string;
    vehicle?: string;
    location?: string;
    caseId?: string;
    verificationStatus: string;
    identityConfidence: number;
  };
  aliases: Array<{
    alias_id?: string;
    alias_name?: string;
    context?: string;
    alias_type?: string;
  }>;
  relatedRecords: {
    fir_cases: any[];
    criminal_records: any[];
    vehicles: any[];
    communications: any[];
    transactions: any[];
    locations: any[];
  };
  network: {
    nodes: Array<{ id: string; label: string; type: string; riskScore: number; isPrimary?: boolean }>;
    edges: Array<{ source: string; target: string; type: string; label?: string; strength: number }>;
    totalConnections: number;
  };
  timeline: Array<{
    type: string;
    summary: string;
    detail?: string;
    timestamp: string;
  }>;
  aiAnalysis: Array<{
    id: string;
    type: string;
    modelName?: string;
    confidence: number;
    explanation?: string;
    result?: any;
  }>;
  entityMatches: Array<{
    id: string;
    entityA: { id: string; name: string };
    entityB: { id: string; name: string };
    confidence: number;
    reasons?: string;
    status: string;
  }>;
  evidence: Array<{
    id: string;
    name: string;
    description?: string;
    contentType?: string;
    verified?: boolean;
    status?: string;
  }>;
  disclaimer: string;
}

export const reportService = {
  getCases: async (): Promise<ReportCaseOption[]> => {
    return apiRequest<ReportCaseOption[]>('/reports/cases');
  },

  searchEntities: async (query: string): Promise<any[]> => {
    return apiRequest<any[]>(`/reports/entities/search?q=${encodeURIComponent(query)}`);
  },

  generate: async (caseId: string): Promise<GeneratedReport> => {
    return apiRequest<GeneratedReport>(`/reports/generate?caseId=${encodeURIComponent(caseId)}`);
  },

  preview: async (caseId: string): Promise<GeneratedReport> => {
    return apiRequest<GeneratedReport>(`/reports/preview?caseId=${encodeURIComponent(caseId)}`);
  },

  getDossier: async (entityId: string): Promise<EntityDossier> => {
    return apiRequest<EntityDossier>(`/reports/dossier/${encodeURIComponent(entityId)}`);
  },
};
