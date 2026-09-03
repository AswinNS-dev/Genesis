import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  Eye,
  ShieldCheck,
  Clock,
  Globe,
  Terminal,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  auditService,
  AuditSummary,
  AuditEventItem,
  LoginAttemptItem,
  SecurityAlertItem,
} from '../../services/audit';

export const SecurityView: React.FC = () => {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttemptItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Subtab view
  const [viewTab, setViewTab] = useState<'AUDIT_LOGS' | 'SECURITY_ALERTS' | 'LOGIN_LOGS'>('AUDIT_LOGS');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, eventsData, alertsData, attemptsData] = await Promise.all([
        auditService.getSummary(),
        auditService.getEvents({
          action: actionFilter,
          resource: resourceFilter,
          status: statusFilter,
          severity: severityFilter,
          search: search || undefined,
        }),
        auditService.getSecurityAlerts(15),
        auditService.getLoginAttempts(15),
      ]);
      setSummary(sumData);
      setEvents(eventsData.events);
      setTotalEvents(eventsData.total);
      setAlerts(alertsData);
      setLoginAttempts(attemptsData);
    } catch (err: any) {
      console.error('Failed to load security audit data:', err);
      setError(err.message || 'Failed to connect to Security & Audit API');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await auditService.getEvents({
        action: actionFilter,
        resource: resourceFilter,
        status: statusFilter,
        severity: severityFilter,
        search: search || undefined,
      });
      setEvents(data.events);
      setTotalEvents(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to filter audit events');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setResourceFilter('ALL');
    setStatusFilter('ALL');
    setSeverityFilter('ALL');
    setTimeout(() => {
      loadAllData();
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest">
              Security Governance
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
              Live Audit Log
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Security & Access Audit</h1>
          <p className="text-xs text-slate-400">
            Cryptographically sealed immutable audit trails, real-time security alerts, and RBAC governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-sky-400" /> Total Events
          </div>
          <div className="text-xl font-bold text-slate-100 mt-1">{summary?.totalEvents ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Logins
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{summary?.successfulLogins ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Failed Logins
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">{summary?.failedLogins ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Investigator Ops
          </div>
          <div className="text-xl font-bold text-purple-400 mt-1">{summary?.investigatorActions ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Security Alerts
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{summary?.securityAlerts ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Vault Integrity
          </div>
          <div className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {summary?.integrityStatus === 'VERIFIED_INTACT' ? 'INTACT' : 'CHECK'}
          </div>
        </div>
      </div>

      {/* Sub-view Navigation */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setViewTab('AUDIT_LOGS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            viewTab === 'AUDIT_LOGS'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" /> Audit Event Trail ({totalEvents})
        </button>
        <button
          onClick={() => setViewTab('SECURITY_ALERTS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            viewTab === 'SECURITY_ALERTS'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Security Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setViewTab('LOGIN_LOGS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            viewTab === 'LOGIN_LOGS'
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" /> Authentication Logs ({loginAttempts.length})
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <div>
            <span className="font-semibold">Security System Alert: </span>
            {error}
          </div>
        </div>
      )}

      {/* VIEW 1: AUDIT EVENT TRAIL */}
      {viewTab === 'AUDIT_LOGS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by action, user, IP, or resource..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Action Filter */}
              <div>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Actions</option>
                  <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                  <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="ENTITY_RESOLUTION_ANALYSIS">ENTITY_RESOLUTION</option>
                  <option value="ENTITY_MATCH_CONFIRMED">ENTITY_MATCH_CONFIRMED</option>
                  <option value="ENTITY_MATCH_REJECTED">ENTITY_MATCH_REJECTED</option>
                  <option value="REPORT_GENERATED">REPORT_GENERATED</option>
                  <option value="DOSSIER_VIEWED">DOSSIER_VIEWED</option>
                  <option value="EVIDENCE_VERIFIED">EVIDENCE_VERIFIED</option>
                  <option value="UNAUTHORIZED_ACCESS_ATTEMPT">UNAUTHORIZED_ACCESS</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Severities</option>
                  <option value="INFO">INFO</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Audit Events Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                Loading audit events from backend...
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No audit events match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-mono tracking-wider">
                    <tr>
                      <th className="p-3">Event ID</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Actor / Role</th>
                      <th className="p-3">Resource</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {events.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                          {ev.eventId}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-200">
                          {ev.action}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-200">{ev.actor}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{ev.role}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {ev.resource}
                          {ev.resourceId && (
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                              {ev.resourceId}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ev.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : ev.status === 'UNAUTHORIZED'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ev.severity === 'CRITICAL' || ev.severity === 'HIGH'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : ev.severity === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Recent'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400"
                            title="Inspect Event"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SECURITY ALERTS */}
      {viewTab === 'SECURITY_ALERTS' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
              No active security alerts recorded.
            </div>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        al.severity === 'HIGH' || al.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {al.severity} SEVERITY
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">{al.type}</span>
                  </div>
                  <div className="text-xs text-slate-200 font-medium">{al.message}</div>
                  {al.detail && <div className="text-[11px] text-slate-400">{al.detail}</div>}
                </div>

                <div className="text-right text-xs text-slate-500 shrink-0 font-mono">
                  <div>{al.createdAt ? new Date(al.createdAt).toLocaleString() : ''}</div>
                  <div className="mt-1">
                    {al.resolved ? (
                      <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center justify-end gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Active Investigation
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 3: AUTHENTICATION LOGS */}
      {viewTab === 'LOGIN_LOGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-300">
            Authentication Gate Attempts (Last {loginAttempts.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-mono">
              <tr>
                <th className="p-3">User Email</th>
                <th className="p-3">Result</th>
                <th className="p-3">Origin IP</th>
                <th className="p-3">Reason / Details</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loginAttempts.map((att) => (
                <tr key={att.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-200">{att.email}</td>
                  <td className="p-3">
                    {att.success ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SUCCESS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        FAILED
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-400">{att.ip || '127.0.0.1'}</td>
                  <td className="p-3 text-slate-400">{att.reason || 'Authenticated with valid password'}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">
                    {att.attemptAt ? new Date(att.attemptAt).toLocaleString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">{selectedEvent.eventId}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {selectedEvent.action}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Actor</div>
                <div className="font-bold text-slate-200 mt-0.5">{selectedEvent.actor}</div>
                <div className="text-[10px] text-slate-400 font-mono">{selectedEvent.role}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Resource</div>
                <div className="font-bold text-slate-200 mt-0.5">{selectedEvent.resource}</div>
                {selectedEvent.resourceId && (
                  <div className="text-[10px] text-slate-400 font-mono truncate">{selectedEvent.resourceId}</div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Timestamp</div>
                <div className="font-mono text-slate-200 mt-0.5">
                  {selectedEvent.timestamp ? new Date(selectedEvent.timestamp).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Status / Severity</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-emerald-400">{selectedEvent.status}</span>
                  <span className="text-slate-500">|</span>
                  <span className="font-bold text-amber-400">{selectedEvent.severity}</span>
                </div>
              </div>
            </div>

            {selectedEvent.detail && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Action Narrative / Reason</div>
                <div className="text-xs text-slate-300 leading-relaxed">{selectedEvent.detail}</div>
              </div>
            )}

            {(selectedEvent.previousState || selectedEvent.newState) && (
              <div className="bg-slate-950 p-3 rounded-lg border border-purple-500/20 space-y-2">
                <div className="text-[10px] text-purple-400 uppercase font-bold">State Transition</div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">{selectedEvent.previousState || 'NONE'}</span>
                  <span className="text-purple-400">→</span>
                  <span className="text-emerald-400 font-bold">{selectedEvent.newState || 'UPDATED'}</span>
                </div>
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">Session Metadata</div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Origin IP: {selectedEvent.ip}</span>
                {selectedEvent.caseId && <span>Case Reference: {selectedEvent.caseId}</span>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
