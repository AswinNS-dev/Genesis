import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, FolderKanban, Network, ShieldCheck, Users } from 'lucide-react';
import { dashboardService, DashboardSummary } from '../../services/dashboard';
import { caseService, Case } from '../../services/cases';

export const DashboardView: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, cases] = await Promise.all([
        dashboardService.getSummary(),
        caseService.getCases(undefined, undefined, 6),
      ]);
      setSummary(dashboard);
      setRecentCases(cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-100">Investigation Dashboard</h1>
        <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={() => void loadDashboard()} className="underline">Retry</button>
        </div>
      </div>
    );
  }

  const metrics = [
    ['Active cases', summary?.active_cases ?? 0, FolderKanban, 'text-sky-400'],
    ['Entities', summary?.total_entities ?? 0, Users, 'text-blue-400'],
    ['Communications', summary?.communications ?? 0, Activity, 'text-cyan-400'],
    ['Transactions', summary?.transactions ?? 0, Network, 'text-emerald-400'],
    ['Evidence', summary?.evidence_documents ?? 0, ShieldCheck, 'text-teal-400'],
    ['Alerts', summary?.pending_matches ?? 0, AlertTriangle, 'text-amber-400'],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Investigation Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Current metrics returned by the FastAPI service.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-100">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Recent cases</h2>
          <span className="text-xs text-slate-500">{summary?.total_cases ?? 0} total</span>
        </div>
        {recentCases.length === 0 ? (
          <p className="text-sm text-slate-500">No cases found.</p>
        ) : (
          <div className="space-y-2">
            {recentCases.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-sky-400">{item.caseId}</div>
                  <div className="truncate text-sm text-slate-200">{item.title}</div>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};