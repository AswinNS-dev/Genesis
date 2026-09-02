import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, Users, FolderKanban, Activity, AlertTriangle,
  Network, Database, FileText, TrendingUp
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Case, Entity } from '../../types';

interface Stats {
  openCases: number;
  closedCases: number;
  entityCount: number;
  relationshipCount: number;
  aiAlertCount: number;
  patternCount: number;
  datasetCount: number;
  datasetRecordCount: number;
  blockchainIntact: boolean;
  blockchainBlocks: number;
  entityTypes: Record<string, number>;
}

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [highRiskEntities, setHighRiskEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, casesData, entitiesData] = await Promise.all([
          apiRequest<Stats>('/analysis/stats'),
          apiRequest<Case[]>('/cases'),
          apiRequest<Entity[]>('/entities'),
        ]);
        setStats(statsData);
        setRecentCases(casesData.slice(0, 5));
        setHighRiskEntities(
          entitiesData
            .filter((e) => e.riskScore >= 70)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 5)
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Executive Intelligence Overview</h1>
        <p className="text-sm text-slate-400">Real-time status across ongoing criminal investigation dockets.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active Cases', value: stats!.openCases, icon: FolderKanban, tint: 'text-sky-400', hint: `${stats!.closedCases} closed` },
          { label: 'Entities', value: stats!.entityCount, icon: Users, tint: 'text-purple-400', hint: `${Object.keys(stats!.entityTypes).length} types` },
          { label: 'Relationships', value: stats!.relationshipCount, icon: Network, tint: 'text-indigo-400', hint: 'graph edges' },
          { label: 'AI Alerts', value: stats!.aiAlertCount, icon: AlertTriangle, tint: 'text-amber-400', hint: `${stats!.patternCount} patterns` },
          { label: 'Datasets', value: stats!.datasetCount, icon: Database, tint: 'text-teal-400', hint: `${stats!.datasetRecordCount} records` },
          { label: 'Ledger', value: stats!.blockchainBlocks, icon: ShieldCheck, tint: stats!.blockchainIntact ? 'text-emerald-400' : 'text-rose-400', hint: stats!.blockchainIntact ? 'INTACT' : 'BROKEN' },
        ].map(({ label, value, icon: Icon, tint, hint }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-semibold uppercase">{label}</span>
              <Icon className={`w-4 h-4 ${tint}`} />
            </div>
            <div className={`text-2xl font-bold ${tint}`}>{value.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>
          </div>
        ))}
      </div>

      {/* Entity Type Breakdown */}
      {Object.keys(stats!.entityTypes).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Entity Registry Breakdown
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats!.entityTypes)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-semibold text-slate-400">{type}</span>
                  <span className="text-sm font-bold text-slate-200">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-sky-400" />
            Recent Cases
          </h2>
          {recentCases.length === 0 ? (
            <p className="text-sm text-slate-500">No cases yet.</p>
          ) : (
            <div className="space-y-2">
              {recentCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/40 gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-sky-400">{c.caseId}</div>
                    <div className="text-sm font-medium text-slate-200 truncate">{c.title}</div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${
                    c.status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High-Risk Entities */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            High-Risk Entities
          </h2>
          {highRiskEntities.length === 0 ? (
            <p className="text-sm text-slate-500">No high-risk entities flagged.</p>
          ) : (
            <div className="space-y-2">
              {highRiskEntities.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded border border-slate-700/30">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{e.name}</div>
                    <div className="text-xs text-slate-500">{e.type}</div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                    e.riskScore >= 80
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                  }`}>
                    {e.riskScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prototype notice */}
      <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-start gap-3 text-xs text-sky-300">
        <Activity className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>CrimeIntel Prototype:</strong> All data is entirely fictional and generated for demonstration purposes only.
          AI outputs are investigative leads requiring human verification — not determinations of guilt.
        </span>
      </div>
    </div>
  );
};
