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

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  riskScore: number;
  degree?: number;
  degreeCentrality?: number;
  betweenness?: number;
  closeness?: number;
  pagerank?: number;
  communityId?: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  strength: number;
  count?: number;
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  averageDegree: number;
  connectedComponentsCount: number;
  communitiesCount: number;
  isolatedNodesCount: number;
  diameterEstimate: number;
}

export interface GraphAnalysisData {
  statistics: GraphStatistics;
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: Array<{
    id: number;
    name: string;
    color?: string;
    size: number;
    nodes: string[];
  }>;
  patterns: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    severity: string;
    relevance: number;
    entities: string[];
  }>;
  topInfluencers: Array<{
    id: string;
    name: string;
    role?: string;
    type: string;
    pagerank: number;
    betweenness: number;
    degree: number;
    riskScore: number;
  }>;
  topBridges: Array<{
    source: string;
    target: string;
    sourceName?: string;
    targetName?: string;
    type: string;
    betweennessImpact?: number;
  }>;
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
}

export const analysisService = {
  getGraphAnalysis: async (caseId?: string): Promise<GraphAnalysisData> => {
    const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : '';
    return apiRequest<GraphAnalysisData>(`/analysis/graph-analysis${query}`);
  },

  getGraph: async (): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
    return apiRequest<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/analysis/graph');
  },

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

  findShortestPath: async (source: string, target: string) => {
    return apiRequest<any>(`/analysis/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
  },
};
