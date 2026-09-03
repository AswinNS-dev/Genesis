import { apiRequest } from './api';

export interface DatasetItem {
  id: string;
  name: string;
  sourceType: 'CSV' | 'CDR' | 'TRANSACTION' | 'LOCATION' | 'GENERIC_CSV' | string;
  fileName?: string;
  status: string;
  recordCount: number;
  analysisScope: string;
  caseId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DatasetSummary {
  totalDatasets: number;
  totalRecords: number;
  sourceBreakdown: Record<string, number>;
}

export interface DatasetRecordItem {
  id: string;
  rowIndex: number;
  raw: Record<string, any>;
  normalized: Record<string, any>;
  matchStatus: string;
  matchConfidence: number;
  matchReasons?: string;
  createdAt: string;
}

export interface DatasetRecordsResponse {
  total: number;
  limit: number;
  offset: number;
  records: DatasetRecordItem[];
}

export interface IngestJsonPayload {
  name: string;
  sourceType: string;
  analysisScope?: string;
  caseId?: string;
  rawText?: string;
  rows?: Array<Record<string, any>>;
}

export const datasetService = {
  list: async (caseId?: string, search?: string, sourceType?: string): Promise<DatasetItem[]> => {
    const params = new URLSearchParams();
    if (caseId) params.append('caseId', caseId);
    if (search) params.append('search', search);
    if (sourceType && sourceType !== 'ALL') params.append('sourceType', sourceType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<DatasetItem[]>(`/datasets${qs}`);
  },

  getSummary: async (): Promise<DatasetSummary> => {
    return apiRequest<DatasetSummary>('/datasets/summary');
  },

  getById: async (datasetId: string): Promise<DatasetItem> => {
    return apiRequest<DatasetItem>(`/datasets/${encodeURIComponent(datasetId)}`);
  },

  getRecords: async (
    datasetId: string,
    limit: number = 50,
    offset: number = 0,
    search?: string
  ): Promise<DatasetRecordsResponse> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (search) params.append('search', search);
    return apiRequest<DatasetRecordsResponse>(`/datasets/${encodeURIComponent(datasetId)}/records?${params.toString()}`);
  },

  ingestFile: async (formData: FormData): Promise<{ success: boolean; dataset: DatasetItem }> => {
    return apiRequest<{ success: boolean; dataset: DatasetItem }>('/datasets/ingest', {
      method: 'POST',
      body: formData,
      // Note: when body is FormData, apiRequest does not set Content-Type so browser sets boundary multipart automatically
    });
  },

  ingestJson: async (payload: IngestJsonPayload): Promise<{ success: boolean; dataset: DatasetItem }> => {
    return apiRequest<{ success: boolean; dataset: DatasetItem }>('/datasets/ingest-json', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  ingestSample: async (
    sampleType: 'CDR' | 'TRANSACTION' | 'LOCATION' | 'ENTITY',
    caseId?: string
  ): Promise<{ success: boolean; dataset: DatasetItem }> => {
    return apiRequest<{ success: boolean; dataset: DatasetItem }>('/datasets/sample', {
      method: 'POST',
      body: JSON.stringify({ sampleType, caseId }),
    });
  },

  delete: async (datasetId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/datasets/${encodeURIComponent(datasetId)}`, {
      method: 'DELETE',
    });
  },
};
