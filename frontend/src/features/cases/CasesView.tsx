import React, { useEffect, useState } from 'react';
import { caseService, Case } from '../../services/cases';
import { 
  FolderPlus, 
  Search, 
  Filter, 
  ShieldAlert, 
  Clock, 
  User, 
  FileText,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const CasesView: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Financial Fraud');
  const [newInvestigator, setNewInvestigator] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await caseService.getCases(statusFilter, searchTerm);
      setCases(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve cases from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
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
        assignedInvestigator: newInvestigator || 'Investigator Unit',
        classification: 'RESTRICTED'
      });
      setCases([created, ...cases]);
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewInvestigator('');
    } catch (err: any) {
      alert(`Case creation failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Investigation Dockets
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              {cases.length} Total
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, manage, and open criminal intelligence cases stored in Supabase PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCases} 
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh Cases"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/10"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Case Docket</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text"
            placeholder="Search by title, case ID, category, or investigator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-sans"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACTIVE">Active</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Case Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-slate-900/40 animate-pulse rounded-xl border border-slate-800"></div>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 rounded-xl border border-slate-800">
          <FolderPlus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Cases Found</h3>
          <p className="text-xs text-slate-400 mt-1">Create a new case docket or adjust your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div 
              key={c.id}
              className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {c.caseId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {c.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  {c.description || 'No detailed case summary registered.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {c.assignedInvestigator || 'Unassigned'}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {c.entityCount || 0} Entities
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Initialize New Case Docket</h2>
            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Case Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Operation Silverline Syndicate"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Category</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Financial Fraud">Financial Fraud</option>
                  <option value="Money Laundering">Money Laundering</option>
                  <option value="Narcotics Trafficking">Narcotics Trafficking</option>
                  <option value="Cyber Syndicate">Cyber Syndicate</option>
                  <option value="Organized Crime">Organized Crime</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Assigned Investigator</label>
                <input 
                  type="text" 
                  placeholder="e.g. Insp. Vikram Patel"
                  value={newInvestigator}
                  onChange={(e) => setNewInvestigator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Description / Intel Brief</label>
                <textarea 
                  rows={3}
                  placeholder="Summary of suspected activities, target persons, or incoming intelligence..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all"
                >
                  {creating ? 'Saving to Supabase...' : 'Save Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
