import React, { useEffect, useState } from 'react';
import { caseService } from '../../services/cases';
import { Case } from '../../types';
import { FolderKanban, Plus, Shield, Clock } from 'lucide-react';

export const CasesView: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caseService.list()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Case Docket Management</h1>
          <p className="text-sm text-slate-400">Manage registered criminal investigation records.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Register New Case
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map((c) => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {c.caseId}
                </span>
                <h3 className="text-lg font-semibold text-slate-100 mt-2">{c.title}</h3>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {c.status}
              </span>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{c.description || 'No description provided.'}</p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-slate-400" /> {c.classification}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
