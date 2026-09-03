import React, { useState, useEffect } from 'react';
import {
  FileText,
  UserCheck,
  Search,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Phone,
  ArrowRightLeft,
  MapPin,
  Car,
  Users,
  Network,
  Cpu,
  CheckCircle2,
  XCircle,
  FolderLock,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { reportService, GeneratedReport, EntityDossier, ReportCaseOption } from '../../services/reports';

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'DOSSIERS'>('REPORTS');

  // Case Report state
  const [cases, setCases] = useState<ReportCaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Entity Dossier state
  const [entityQuery, setEntityQuery] = useState<string>('');
  const [entityResults, setEntityResults] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [dossier, setDossier] = useState<EntityDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [searchingEntities, setSearchingEntities] = useState<boolean>(false);

  // Fetch available cases on mount
  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await reportService.getCases();
      setCases(data);
      if (data.length > 0 && !selectedCaseId) {
        setSelectedCaseId(data[0].caseId || data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load cases:', err);
    }
  };

  const handleGenerateReport = async (caseIdToUse?: string) => {
    const cid = caseIdToUse || selectedCaseId;
    if (!cid) return;
    setLoadingReport(true);
    setReportError(null);
    try {
      const data = await reportService.generate(cid);
      setReport(data);
    } catch (err: any) {
      setReportError(err.message || 'Failed to generate investigation report');
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSearchEntities = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!entityQuery.trim()) return;
    setSearchingEntities(true);
    try {
      const results = await reportService.searchEntities(entityQuery.trim());
      setEntityResults(results);
    } catch (err: any) {
      console.error('Search failed:', err);
      setEntityResults([]);
    } finally {
      setSearchingEntities(false);
    }
  };

  const handleLoadDossier = async (entityId: string) => {
    setSelectedEntityId(entityId);
    setLoadingDossier(true);
    setDossierError(null);
    try {
      const data = await reportService.getDossier(entityId);
      setDossier(data);
    } catch (err: any) {
      setDossierError(err.message || 'Failed to load entity dossier');
      setDossier(null);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest">
              Law Enforcement Intelligence
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
              Live Backend
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Reports & Dossiers</h1>
          <p className="text-xs text-slate-400">
            Generate and export official confidential law-enforcement case reports and 360° entity dossiers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'REPORTS'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Investigation Reports
          </button>
          <button
            onClick={() => setActiveTab('DOSSIERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'DOSSIERS'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Person & Entity Dossiers
          </button>
        </div>
      </div>

      {/* TAB 1: INVESTIGATION REPORTS */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <label className="text-xs font-medium text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-400" /> Select Case:
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {cases.map((c) => (
                  <option key={c.id || c.caseId} value={c.caseId || c.id}>
                    {c.caseId || c.id} — {c.title} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateReport()}
                disabled={loadingReport || !selectedCaseId}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm"
              >
                {loadingReport ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {loadingReport ? 'Generating Dossier...' : 'Generate Full Report'}
              </button>

              {report && (
                <>
                  <button
                    onClick={handlePrint}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    onClick={() => handleExportJSON(report, `${report.reportId || 'case-report'}.json`)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700"
                    title="Export JSON"
                  >
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error State */}
          {reportError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <div>
                <span className="font-semibold">Failed to load report: </span>
                {reportError}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!report && !loadingReport && !reportError && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">No report generated yet</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                Select an active case from the dropdown above and click &quot;Generate Full Report&quot; to compile comprehensive investigation intelligence.
              </p>
              {cases.length > 0 && (
                <button
                  onClick={() => handleGenerateReport(cases[0].caseId || cases[0].id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 text-xs font-semibold rounded-lg transition-colors"
                >
                  Generate sample report for {cases[0].caseId || cases[0].id}
                </button>
              )}
            </div>
          )}

          {/* Loading Skeleton */}
          {loadingReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-sm font-semibold text-slate-200">Compiling Multi-Source Investigation Intelligence...</div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Querying FIR records, telecom intercepts, bank flows, GPS pings & AI models...
              </p>
            </div>
          )}

          {/* Generated Report View */}
          {report && !loadingReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 print:border-none print:p-0">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-start justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                      {report.case.classification || 'RESTRICTED'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {report.reportId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Source: {report.dataSource}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mt-2">{report.case.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    FIR Case Number: <span className="text-slate-200 font-mono font-semibold">{report.case.caseId}</span> | Category: <span className="text-slate-200">{report.case.category || 'General'}</span> | Jurisdiction: <span className="text-slate-200">{report.case.jurisdiction || 'State'}</span>
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400 space-y-1">
                  <div>Generated: <span className="text-slate-200 font-mono">{new Date(report.generatedAt).toLocaleString()}</span></div>
                  <div>Lead Investigator: <span className="text-sky-400 font-medium">{report.case.assignedInvestigator || 'Officer In-Charge'}</span></div>
                  <div>Status: <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">{report.case.status}</span></div>
                </div>
              </div>

              {/* Case Summary Metrics Cards */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Investigation Summary Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" /> Entities Tracked
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{report.summaryMetrics.entityCount}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-purple-400" /> Network Links
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{report.summaryMetrics.relationshipCount}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" /> Communications
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{report.summaryMetrics.communicationCount}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" /> Transactions
                    </div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{report.summaryMetrics.transactionCount}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Blockchain Seal
                    </div>
                    <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {report.summaryMetrics.blockchainIntegrity}
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Narrative */}
              {report.case.description && (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Investigation Narrative</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{report.case.description}</p>
                </div>
              )}

              {/* Entities & Associated Targets */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Identified Entities & Suspects ({report.entities?.length || 0})
                </h3>
                {report.entities && report.entities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {report.entities.map((e, idx) => (
                      <div key={e.id || idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">{e.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{e.value || e.type}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.riskScore >= 75
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : e.riskScore >= 50
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            Risk {e.riskScore}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded border border-slate-800">
                    No primary entities registered for this case.
                  </div>
                )}
              </div>

              {/* AI Analysis & Multi-Signal Entity Resolution */}
              {report.entityMatches && report.entityMatches.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-lg border border-purple-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Entity Resolution Findings (AI Link Intelligence)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {report.entityMatches.map((m) => (
                      <div key={m.id} className="bg-slate-900/80 p-3 rounded border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{m.entityA?.name || 'Subject A'}</span>
                            <ArrowRightLeft className="w-3 h-3 text-purple-400" />
                            <span>{m.entityB?.name || 'Subject B'}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {m.confidence}% MATCH
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] mt-1">{m.reasons}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'APPROVED' || m.status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : m.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline of Events */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> Chronological Timeline ({report.timeline?.length || 0} Events)
                </h3>
                {report.timeline && report.timeline.length > 0 ? (
                  <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-900 max-h-64 overflow-y-auto">
                    {report.timeline.slice(0, 10).map((t, idx) => (
                      <div key={t.id || idx} className="p-3 text-xs flex items-start gap-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-sky-400 shrink-0">
                          {t.type}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-200">{t.summary}</div>
                          {t.detail && <div className="text-slate-400 text-[11px] mt-0.5">{t.detail}</div>}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                          {t.eventAt || t.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded border border-slate-800">
                    No timeline events recorded.
                  </div>
                )}
              </div>

              {/* Intercepts: Communications & Transactions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Communications */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" /> Call Detail Records (CDR)
                  </h3>
                  <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-900 max-h-48 overflow-y-auto">
                    {report.communications && report.communications.length > 0 ? (
                      report.communications.slice(0, 6).map((c, i) => (
                        <div key={c.id || i} className="p-2.5 text-[11px] flex justify-between items-center">
                          <div>
                            <div className="font-medium text-slate-200">{c.caller} → {c.receiver}</div>
                            <div className="text-slate-500 font-mono text-[10px]">{c.timestamp} | {c.location || 'Tower Ping'}</div>
                          </div>
                          {c.isAnomaly || c.flagged ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              FLAGGED
                            </span>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 italic">No CDR records available.</div>
                    )}
                  </div>
                </div>

                {/* Financial Transactions */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" /> Financial Transactions
                  </h3>
                  <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-900 max-h-48 overflow-y-auto">
                    {report.transactions && report.transactions.length > 0 ? (
                      report.transactions.slice(0, 6).map((tx, i) => (
                        <div key={tx.id || i} className="p-2.5 text-[11px] flex justify-between items-center">
                          <div>
                            <div className="font-medium text-slate-200">{tx.sender} → {tx.receiver}</div>
                            <div className="text-slate-500 font-mono text-[10px]">{tx.timestamp} | {tx.type || 'Transfer'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-200">₹{tx.amount?.toLocaleString()}</div>
                            {tx.isSuspicious || tx.suspicious ? (
                              <span className="text-[9px] text-rose-400 font-semibold">SUSPICIOUS</span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 italic">No financial transactions tracked.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Evidence & Custody */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FolderLock className="w-3.5 h-3.5 text-sky-400" /> Evidence Documents & Blockchain Custody
                </h3>
                {report.evidence && report.evidence.length > 0 ? (
                  <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-900">
                    {report.evidence.map((d) => (
                      <div key={d.id} className="p-3 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">{d.name}</div>
                          <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                            SHA-256: {d.sha256?.slice(0, 32)}...
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.verified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {d.verified ? 'SEALED & VERIFIED' : 'PENDING NOTARIZATION'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded border border-slate-800">
                    No physical or digital evidence documents registered.
                  </div>
                )}
              </div>

              {/* Audit Trail for this report */}
              {report.auditTrail && report.auditTrail.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Audit Trail & Chain of Actions
                  </h3>
                  <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-900 max-h-40 overflow-y-auto">
                    {report.auditTrail.slice(0, 5).map((a) => (
                      <div key={a.id} className="p-2.5 text-[11px] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400">{a.action}</span>
                          <span className="text-slate-300">{a.detail}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[10px]">{a.createdAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Disclaimer */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{report.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERSON & ENTITY DOSSIERS */}
      {activeTab === 'DOSSIERS' && (
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <form onSubmit={handleSearchEntities} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={entityQuery}
                  onChange={(e) => setEntityQuery(e.target.value)}
                  placeholder="Search subject by name, phone number, vehicle plate, or Person ID (e.g. Rahul Kumar, P-00001)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={searchingEntities || !entityQuery.trim()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 justify-center"
              >
                {searchingEntities ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search Registry
              </button>
            </form>

            {/* Entity Search Results Dropdown/Pills */}
            {entityResults.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-400 font-semibold mb-2">Search Matches ({entityResults.length}):</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {entityResults.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => handleLoadDossier(e.id)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                        selectedEntityId === e.id
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{e.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{e.id} | {e.value || e.type}</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dossier Error State */}
          {dossierError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <div>
                <span className="font-semibold">Failed to load dossier: </span>
                {dossierError}
              </div>
            </div>
          )}

          {/* Dossier Loading State */}
          {loadingDossier && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-sm font-semibold text-slate-200">Assembling 360° Forensic Entity Dossier...</div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Correlating identity aliases, cross-jurisdictional FIRs, call graphs & vehicle registrations...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!dossier && !loadingDossier && !dossierError && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <UserCheck className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">No subject dossier selected</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                Use the search box above to look up any subject, vehicle, or phone number in the 100,000+ entity registry.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEntityQuery('Rahul Kumar');
                    reportService.searchEntities('Rahul Kumar').then(setEntityResults);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 text-xs rounded-lg transition-colors"
                >
                  Quick search &quot;Rahul Kumar&quot;
                </button>
                <button
                  onClick={() => {
                    setEntityQuery('P-00001');
                    reportService.searchEntities('P-00001').then(setEntityResults);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs rounded-lg transition-colors"
                >
                  Quick search &quot;P-00001&quot;
                </button>
              </div>
            </div>
          )}

          {/* Dossier Display */}
          {dossier && !loadingDossier && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              {/* Dossier Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                      SUBJECT INTELLIGENCE DOSSIER
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {dossier.dossierId}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mt-2">{dossier.identity.primaryName}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>Entity ID: <strong className="text-slate-200 font-mono">{dossier.identity.id}</strong></span>
                    <span>Status: <strong className="text-emerald-400">{dossier.identity.verificationStatus}</strong></span>
                    <span>Confidence: <strong className="text-sky-400">{dossier.identity.identityConfidence}%</strong></span>
                    <span>Risk Rating: <strong className="text-rose-400">{dossier.identity.riskScore}/100</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    onClick={() => handleExportJSON(dossier, `${dossier.dossierId}.json`)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              {/* Identity & Identifiers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Registered Phone Identifiers</div>
                  <div className="text-sm font-mono text-slate-200 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-400" />
                    {dossier.identity.phone || 'No phone recorded'}
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Registered Vehicle Assets</div>
                  <div className="text-sm font-mono text-slate-200 flex items-center gap-2">
                    <Car className="w-4 h-4 text-sky-400" />
                    {dossier.identity.vehicle || 'No vehicle registered'}
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Frequent Locations / Jurisdiction</div>
                  <div className="text-sm font-mono text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {dossier.identity.location || 'Unknown Jurisdiction'}
                  </div>
                </div>
              </div>

              {/* Aliases & Secondary Identifiers */}
              {dossier.aliases && dossier.aliases.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Known Aliases & Street Monikers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {dossier.aliases.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono">
                        {typeof a === 'string' ? a : a.alias_name || 'Alias'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related FIR Cases */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Linked FIR Cases & Dockets ({dossier.relatedRecords?.fir_cases?.length || 0})
                </h3>
                {dossier.relatedRecords?.fir_cases && dossier.relatedRecords.fir_cases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dossier.relatedRecords.fir_cases.map((fc, i) => (
                      <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                        <div className="font-bold text-slate-200">{fc.case_number || fc.fir_id}</div>
                        <div className="text-slate-400 mt-1">{fc.crime_type} — {fc.jurisdiction_city}</div>
                        <div className="text-slate-500 font-mono text-[10px] mt-0.5">Status: {fc.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded border border-slate-800">
                    No linked criminal court cases recorded.
                  </div>
                )}
              </div>

              {/* Network Intelligence */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Network Intelligence & Associated Targets ({dossier.network?.nodes?.length || 0} Nodes)
                </h3>
                {dossier.network?.nodes && dossier.network.nodes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {dossier.network.nodes.map((n) => (
                      <div key={n.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-slate-200">{n.label}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{n.type}</div>
                        </div>
                        {n.isPrimary ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            PRIMARY
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Risk {n.riskScore}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded border border-slate-800">
                    No network ties currently documented.
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{dossier.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
