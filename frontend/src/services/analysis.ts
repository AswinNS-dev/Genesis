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
  reasons: string;
  status: string;
  createdAt: string;
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

  findShortestPath: async (source: string, target: string) => {
    return apiRequest<any>(`/analysis/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
  },
};
