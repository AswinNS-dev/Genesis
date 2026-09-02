import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardSummary } from '../../services/dashboard';
import { caseService, Case } from '../../services/cases';
import { 
  FolderLock, 
  Users, 
  FileCheck2, 
  Cpu, 
  UserCheck, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  ShieldCheck
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [sum, cases] = await Promise.all([
          dashboardService.getSummary(),
          caseService.getCases(),
        ]);
        setSummary(sum);
        setRecentCases(cases.slice(0, 5));
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard metrics from Supabase.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    {
      title: 'Total Active Cases',
      value: summary ? `${summary.active_cases} / ${summary.total_cases}` : '...',
      label: 'Open & In-Progress Dockets',
      icon: FolderLock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    {
      title: 'Monitored Entities',
      value: summary ? summary.total_entities.toLocaleString() : '...',
      label: 'Persons, Phones & Vehicles',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'Notarized Evidence',
      value: summary ? summary.evidence_items.toLocaleString() : '...',
      label: 'Immutable Ledger Vault',
      icon: FileCheck2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      title: 'AI Forensic Analyses',
      value: summary ? summary.ai_analyses.toLocaleString() : '...',
      label: 'NER & Anomaly Runs',
      icon: Cpu,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    {
      title: 'Pending Entity Matches',
      value: summary ? summary.pending_matches.toLocaleString() : '...',
      label: 'Awaiting Investigator Review',
      icon: UserCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    {
      title: 'Security / AI Alerts',
      value: summary ? summary.alerts.toLocaleString() : '...',
      label: 'High Priority Flags',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Investigation Command Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              SUPABASE LIVE
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time criminal intelligence metrics and AI correlation engine connected to Supabase PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>PostgreSQL Single Source of Truth</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => window.location.reload()} className="underline hover:text-rose-200">Retry</button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className={`p-5 rounded-xl bg-slate-900/40 border ${stat.border} hover:border-slate-700 transition-all flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.title}</span>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight font-mono">
                  {loading ? (
                    <div className="h-8 w-24 bg-slate-800 animate-pulse rounded"></div>
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span>{stat.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Cases Section */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Active Investigation Dockets</h2>
          </div>
          <span className="text-xs text-slate-400">Showing latest records</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-slate-800/40 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : recentCases.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active investigation cases found in Supabase.
          </div>
        ) : (
          <div className="space-y-2">
            {recentCases.map((c) => (
              <div 
                key={c.id} 
                className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-xs font-semibold">
                    {c.caseId}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{c.category || 'General Investigation'} • {c.assignedInvestigator || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {c.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                    {c.entityCount || 0} entities
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
