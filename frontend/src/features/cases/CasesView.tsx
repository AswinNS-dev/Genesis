import React, { useEffect, useState } from 'react';
import { caseService, Case, CaseSummaryResponse, TimelineEventItem, CommunicationItem, TransactionItem, LocationItem } from '../../services/cases';
import { 
  FolderPlus, 
  Search, 
  Filter, 
  ShieldAlert, 
  Clock, 
  User, 
  FileText,
  CheckCircle2,
  RefreshCw,
  FolderKanban,
  X,
  PhoneCall,
  Coins,
  MapPin,
  Scale,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const CasesView: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Financial Fraud');
  const [newAccused, setNewAccused] = useState('');
  const [newVictim, setNewVictim] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState('');
  const [newInvestigator, setNewInvestigator] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail Modal State
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline' | 'comms' | 'txns' | 'locations'>('overview');
  const [caseSummary, setCaseSummary] = useState<CaseSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventItem[]>([]);
  const [comms, setComms] = useState<CommunicationItem[]>([]);
  const [txns, setTxns] = useState<TransactionItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [page, setPage] = useState(0);
  const pageSize = 60;

  const fetchCases = async (currentPage = page) => {
    try {
      setLoading(true);
      const data = await caseService.getCases(statusFilter, searchTerm, pageSize, currentPage * pageSize);
      setCases(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve cases from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // Live debounced search across all 941 Supabase cases
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchCases(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [statusFilter, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchCases(0);
  };

  const handleNextPage = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCases(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    if (page > 0) {
      const prevPage = page - 1;
      setPage(prevPage);
      fetchCases(prevPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreating(true);
      const created = await caseService.createCase({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        accusedName: newAccused || 'Under Investigation',
        victimName: newVictim || 'State of India',
        jurisdiction: newJurisdiction || 'New Delhi',
        assignedInvestigator: newInvestigator || 'Officer Priya Singh',
        classification: 'RESTRICTED',
        status: 'UNDER_INVESTIGATION'
      });
      await fetchCases();
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewAccused('');
      setNewVictim('');
      setNewJurisdiction('');
      setNewInvestigator('');
      openCaseDetails(created);
    } catch (err: any) {
      alert(`Case creation failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const openCaseDetails = async (c: Case) => {
    setSelectedCase(c);
    setDetailTab('overview');
    setDetailLoading(true);
    try {
      const [sum, time, com, tx, loc] = await Promise.all([
        caseService.getSummary(c.id).catch(() => null),
        caseService.getTimeline(c.id).catch(() => []),
        caseService.getCommunications(c.id).catch(() => []),
        caseService.getTransactions(c.id).catch(() => []),
        caseService.getLocations(c.id).catch(() => []),
      ]);
      setCaseSummary(sum);
      setTimeline(time);
      setComms(com);
      setTxns(tx);
      setLocations(loc);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            FIR Case Management
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              {cases.length} Dockets Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, search, and manage 938 FIR crime investigation dockets stored in Supabase PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchCases()} 
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh Dockets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/10"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Open New Case</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text"
            placeholder="Search by FIR ID, Case Number, Crime Type, Accused, Victim, Officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Case Statuses</option>
            <option value="INVESTIGATION">Under Investigation</option>
            <option value="CHARGESHEETED">Chargesheeted</option>
            <option value="CONVICTED">Convicted</option>
            <option value="ACQUITTED">Acquitted</option>
            <option value="OPEN">Open</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Cases Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-slate-900/40 border border-slate-800/80 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-800/60 rounded-xl">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No matching investigation cases</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search terms or filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div 
              key={c.id} 
              onClick={() => openCaseDetails(c)}
              className="bg-slate-900/40 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900/70 p-5 rounded-xl transition-all flex flex-col justify-between cursor-pointer group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold">
                    {c.caseId}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                    {c.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {c.description || 'No detailed case notes provided.'}
                </p>
                {c.accusedName && (
                  <div className="mt-3 p-2 bg-slate-950/40 rounded border border-slate-800/60 text-xs">
                    <span className="text-slate-500">Accused:</span> <span className="text-slate-200 font-medium">{c.accusedName}</span>
                    {c.victimName && (
                      <div><span className="text-slate-500">Victim:</span> <span className="text-slate-300">{c.victimName}</span></div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <MapPin className="w-3.5 h-3.5" />
                  {c.jurisdiction || 'New Delhi'}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  {c.assignedInvestigator?.split(' ')[0] || 'Investigator'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-xs font-semibold border border-amber-500/20">
                    {selectedCase.caseId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {selectedCase.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedCase.title}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedCase.category} • Jurisdiction: {selectedCase.jurisdiction || 'Jurisdiction'} • Lead: {selectedCase.assignedInvestigator}
                </p>
              </div>
              <button 
                onClick={() => setSelectedCase(null)} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 px-6 gap-6 text-sm bg-slate-950/30">
              {(['overview', 'timeline', 'comms', 'txns', 'locations'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`py-3 font-medium capitalize border-b-2 transition-colors ${
                    detailTab === tab 
                      ? 'border-amber-400 text-amber-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'comms' ? 'Communications' : tab === 'txns' ? 'Transactions' : tab}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {detailLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-800 animate-pulse rounded"></div>)}
                </div>
              ) : detailTab === 'overview' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Accused</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedCase.accusedName || 'Under Investigation'}</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Victim</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedCase.victimName || 'State'}</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Court Status</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedCase.courtStatus || 'Under Trial'}</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Bail Status</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedCase.bailStatus || 'Pending'}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Case Intelligence Notes</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{selectedCase.description || 'No notes available.'}</p>
                  </div>
                </div>
              ) : detailTab === 'timeline' ? (
                <div className="space-y-3">
                  {timeline.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No timeline events recorded for this case.</div>
                  ) : (
                    timeline.map((e) => (
                      <div key={e.id} className="p-3 bg-slate-950/50 rounded border border-slate-800 flex items-start gap-3">
                        <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-slate-200">{e.summary}</span>
                          <p className="text-xs text-slate-400 mt-0.5">{e.detail}</p>
                          <span className="text-[10px] font-mono text-slate-500 mt-1 block">{e.eventAt}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : detailTab === 'comms' ? (
                <div className="space-y-2">
                  {comms.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No communication intercepts found.</div>
                  ) : (
                    comms.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{c.caller} $\rightarrow$ {c.receiver}</div>
                          <div className="text-xs text-slate-400">{c.type} • {c.location || 'Tower Location'}</div>
                        </div>
                        <div className="text-right font-mono text-xs text-slate-400">
                          <div>{c.duration || `${c.durationSec || 0}s`}</div>
                          <div className="text-[10px] text-slate-500">{c.timestamp.split('T')[0]}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : detailTab === 'txns' ? (
                <div className="space-y-2">
                  {txns.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No financial transactions recorded.</div>
                  ) : (
                    txns.map((t) => (
                      <div key={t.id} className="p-3 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{t.sender} $\rightarrow$ {t.receiver}</div>
                          <div className="text-xs text-slate-400">{t.transactionType || t.type || 'Bank Transfer'}</div>
                        </div>
                        <div className="text-right font-mono text-sm font-bold text-emerald-400">
                          INR {t.amount.toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {locations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No location traces recorded.</div>
                  ) : (
                    locations.map((l) => (
                      <div key={l.id} className="p-3 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{l.name}</div>
                          <div className="text-xs text-slate-400">{l.address || 'Geo Coordinates'}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {l.type || 'Location Ping'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Open New FIR Investigation Case</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Case Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Cyber Hawala Network Infiltration" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Crime Category</label>
                  <select 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Financial Fraud">Financial Fraud</option>
                    <option value="Money Laundering">Money Laundering</option>
                    <option value="Cybercrime">Cybercrime</option>
                    <option value="Narcotics">Narcotics</option>
                    <option value="Human Trafficking">Human Trafficking</option>
                    <option value="Vehicle Theft">Vehicle Theft</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Jurisdiction City</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mumbai" 
                    value={newJurisdiction}
                    onChange={(e) => setNewJurisdiction(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Primary Accused</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Vikram Seth" 
                    value={newAccused}
                    onChange={(e) => setNewAccused(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Assigned Officer</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Insp. Vikram Rao" 
                    value={newInvestigator}
                    onChange={(e) => setNewInvestigator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Initial Case Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Intelligence summary, IPC sections, or confidential initial brief..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all"
                >
                  {creating ? 'Registering...' : 'Save to Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
