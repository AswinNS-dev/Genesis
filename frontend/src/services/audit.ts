import { apiRequest } from './api';

export interface AuditSummary {
  totalEvents: number;
  failedLogins: number;
  successfulLogins: number;
  securityAlerts: number;
  investigatorActions: number;
  entityDecisions: number;
  reportAccessCount: number;
  dossierAccessCount: number;
  unauthorizedAttempts: number;
  integrityStatus: string;
  brokenBlockIndex?: number | null;
}

export interface AuditEventItem {
  id: string;
  eventId: string;
  action: string;
  detail?: string;
  resource: string;
  resourceId?: string;
  status: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  role?: string;
  actor: string;
  actorId?: string;
  actorEmail?: string;
  ip?: string;
  userAgent?: string;
  previousState?: string;
  newState?: string;
  caseId?: string;
  timestamp: string;
}

export interface AuditEventsResponse {
  total: number;
  limit: number;
  offset: number;
  events: AuditEventItem[];
}

export interface LoginAttemptItem {
  id: string;
  email: string;
  success: boolean;
  ip?: string;
  reason?: string;
  attemptAt: string;
  userId?: string;
}

export interface SecurityAlertItem {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  message: string;
  detail?: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  userId?: string;
}

export interface AuditFilterParams {
  action?: string;
  resource?: string;
  status?: string;
  severity?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const auditService = {
  getSummary: async (): Promise<AuditSummary> => {
    return apiRequest<AuditSummary>('/audit/summary');
  },

  getEvents: async (params: AuditFilterParams = {}): Promise<AuditEventsResponse> => {
    const q = new URLSearchParams();
    if (params.action && params.action !== 'ALL') q.append('action', params.action);
    if (params.resource && params.resource !== 'ALL') q.append('resource', params.resource);
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.severity && params.severity !== 'ALL') q.append('severity', params.severity);
    if (params.search) q.append('search', params.search);
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset) q.append('offset', params.offset.toString());

    const queryString = q.toString() ? `?${q.toString()}` : '';
    return apiRequest<AuditEventsResponse>(`/audit/events${queryString}`);
  },

  getEventDetail: async (eventId: string): Promise<AuditEventItem> => {
    return apiRequest<AuditEventItem>(`/audit/events/${encodeURIComponent(eventId)}`);
  },

  getLoginAttempts: async (limit: number = 20): Promise<LoginAttemptItem[]> => {
    return apiRequest<LoginAttemptItem[]>(`/audit/login-attempts?limit=${limit}`);
  },

  getSecurityAlerts: async (limit: number = 20): Promise<SecurityAlertItem[]> => {
    return apiRequest<SecurityAlertItem[]>(`/audit/security-alerts?limit=${limit}`);
  },
};
