import { apiRequest } from './api';

export interface NERResult {
  text: string;
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface EntityResolutionResultItem {
  input_entity: string;
  matched_entity_id?: string;
  canonical_name?: string;
  decision: string;
  confidence: number;
  requires_review: boolean;
  explanation: string;
  signals: Record<string, number>;
}

export interface EntityMatchRecord {
  id: string;
  entityAId: string;
  entityBId: string;
  confidence: number;
  reasons?: string;
  status: string;
  createdAt?: string;
}

export interface LocationAnomalyRecord {
  person_id?: string;
  location_id?: string;
  visit_count?: number;
  unique_days?: number;
  average_time_between_visits_sec?: number;
  night_visit_ratio?: number;
  weekend_visit_ratio?: number;
  unique_event_types?: number;
  unique_cases?: number;
  duration_days?: number;
  location_entropy?: number;
  anomaly_score?: number;
  is_anomaly?: number;
  risk_band?: string;
}

export interface LocationAnalyzeResponse {
  analysis?: LocationAnomalyRecord[];
  error?: string;
}

export interface SummarizerResponse {
  summary: string;
  fallback: boolean;
  confidence?: number;
}

export interface LeadItem {
  p1?: string;
  p2?: string;
  communication_frequency?: number;
  average_call_duration?: number;
  transaction_count?: number;
  total_amount?: number;
  average_amount?: number;
  shared_case_count?: number;
  evidence_count?: number;
  multi_source_support?: number;
  priority_score?: number;
  priority_band?: string;
}

export interface LeadGenerateResponse {
  leads: LeadItem[];
}

export interface ExplainResponse {
  human_explanation: string;
  supporting_evidence: Record<string, any>;
}

export interface IntelligenceHealthResponse {
  status: string;
  service: string;
  models: Record<string, string>;
  persistence?: string;
  data_source?: string;
}

export interface SupabaseStatusResponse {
  status: string;
  configured: boolean;
  reachable: boolean;
  supabase_url: string;
  table_counts: Record<string, number>;
  timestamp: string;
  error?: string | null;
}

export const analysisService = {
  extractNER: async (text: string, caseId?: string): Promise<NERResult> => {
    const query = caseId ? `?caseId=${caseId}` : '';
    return apiRequest<NERResult>(`/intelligence/ner${query}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  resolveEntities: async (
    extractedEntities: Array<{ name: string; phone?: string; vehicle?: string; location?: string; type?: string }>,
    registryCandidates?: Array<{ id: string; name: string; type?: string; phone?: string; vehicle?: string; location?: string }>,
    caseId?: string
  ): Promise<{ results: EntityResolutionResultItem[] }> => {
    const query = caseId ? `?caseId=${caseId}` : '';
    return apiRequest<{ results: EntityResolutionResultItem[] }>(`/intelligence/entity-resolution${query}`, {
      method: 'POST',
      body: JSON.stringify({
        extracted_entities: extractedEntities,
        registry_candidates: registryCandidates || [],
      }),
    });
  },

  updateMatchStatus: async (matchId: string, status: 'APPROVED' | 'REJECTED') => {
    return apiRequest<{ success: boolean; id: string; status: string }>(`/intelligence/entity-matches/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  listEntityMatches: async (status?: string): Promise<EntityMatchRecord[]> => {
    const query = status ? `?status=${status}` : '';
    return apiRequest<EntityMatchRecord[]>(`/intelligence/entity-matches${query}`);
  },

  analyzeLocation: async (personId: string): Promise<LocationAnalyzeResponse> => {
    return apiRequest<LocationAnalyzeResponse>('/intelligence/location/analyze', {
      method: 'POST',
      body: JSON.stringify({ person_id: personId }),
    });
  },

  summarizeCase: async (caseContext: string): Promise<SummarizerResponse> => {
    return apiRequest<SummarizerResponse>('/intelligence/summarizer/summarize', {
      method: 'POST',
      body: JSON.stringify({ case_context: caseContext }),
    });
  },

  generateLeads: async (personId?: string, caseId?: string): Promise<LeadGenerateResponse> => {
    return apiRequest<LeadGenerateResponse>('/intelligence/leads/generate', {
      method: 'POST',
      body: JSON.stringify({ person_id: personId, case_id: caseId }),
    });
  },

  explainPrediction: async (
    featureName: string,
    featureValue: any,
    direction: 'positive' | 'negative',
    personId: string
  ): Promise<ExplainResponse> => {
    return apiRequest<ExplainResponse>('/intelligence/explain/prediction', {
      method: 'POST',
      body: JSON.stringify({
        feature_name: featureName,
        feature_value: featureValue,
        direction,
        person_id: personId,
      }),
    });
  },

  getIntelligenceHealth: async (): Promise<IntelligenceHealthResponse> => {
    return apiRequest<IntelligenceHealthResponse>('/intelligence/health');
  },

  getSupabaseStatus: async (): Promise<SupabaseStatusResponse> => {
    return apiRequest<SupabaseStatusResponse>('/debug/data-status');
  },

  extractRelationships: async (events: Array<Record<string, unknown>>) => {
    return apiRequest<{ relationships: Array<Record<string, unknown>> }>('/intelligence/relationships/extract', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  },

  detectCommunicationAnomalies: async (records: Array<Record<string, unknown>>) => {
    return apiRequest<{ anomalies: Array<Record<string, unknown>> }>('/intelligence/anomaly/communications', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  detectTransactionAnomalies: async (records: Array<Record<string, unknown>>) => {
    return apiRequest<{ anomalies: Array<Record<string, unknown>> }>('/intelligence/anomaly/transactions', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  detectTemporalAnomalies: async (caseId: string) => {
    return apiRequest<Record<string, unknown>>('/analysis/temporal', {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    });
  },

  findShortestPath: async (source: string, target: string) => {
    return apiRequest<any>(`/analysis/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
  },
};
