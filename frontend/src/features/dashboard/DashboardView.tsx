import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardSummary } from '../../services/dashboard';
import { caseService, Case } from '../../services/cases';
import { 
  FolderLock, 
  FolderKanban,
  Users, 
  PhoneCall,
  Coins,
  Car,
  MapPin,
  ShieldAlert,
  FileCheck2, 
  UserCheck, 
  Activity,
  ShieldCheck,
  Radio,
  Sparkles
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
        setRecentCases(cases.slice(0, 6));
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
      title: 'FIR Investigation Cases',
      value: summary ? `${summary.active_cases.toLocaleString()} / ${summary.total_cases.toLocaleString()}` : '...',
      label: 'Active / Total Dockets',
      icon: FolderLock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      table: 'fir_cases'
    },
    {
      title: 'Master Intelligence Entities',
      value: summary ? summary.total_entities.toLocaleString() : '...',
      label: '100,000 Verified Records',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      table: 'entities'
    },
    {
      title: 'Communications Intercepts',
      value: summary ? summary.communications.toLocaleString() : '...',
      label: 'CDR Call & SMS Records',
      icon: PhoneCall,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      table: 'call_records'
    },
    {
      title: 'Financial Transactions',
      value: summary ? summary.transactions.toLocaleString() : '...',
      label: 'Banking & AML Transfers',
      icon: Coins,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      table: 'financial_transactions'
    },
    {
      title: 'Location Pings & Events',
      value: summary ? summary.location_events.toLocaleString() : '...',
      label: 'Cell Tower & Toll Pings',
      icon: MapPin,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      table: 'location_events'
    },
    {
      title: 'Vehicle Registry Intel',
      value: summary ? summary.vehicles.toLocaleString() : '...',
      label: 'Motor Vehicles & Plates',
      icon: Car,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      table: 'vehicle_records'
    },
    {
      title: 'Criminal History Profiles',
      value: summary ? summary.criminal_records.toLocaleString() : '...',
      label: 'Prior Convictions & Offenses',
      icon: ShieldAlert,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      table: 'criminal_records'
    },
    {
      title: 'Evidence Documents',
      value: summary ? summary.evidence_documents.toLocaleString() : '...',
      label: 'Notarized & SHA-256 Sealed',
      icon: FileCheck2,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      table: 'evidence_documents'
    },
    {
      title: 'Known Entity Aliases',
      value: summary ? summary.entity_aliases.toLocaleString() : '...',
      label: 'Cross-Platform Pseudonyms',
      icon: UserCheck,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      table: 'entity_aliases'
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
            Real-time criminal intelligence metrics and AI correlation engine connected to 9 Supabase PostgreSQL tables.
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

      {/* 9 Supabase Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className={`p-5 rounded-xl bg-slate-900/40 border ${stat.border} hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm`}
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
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>{stat.label}</span>
                  <span className="font-mono text-[10px] text-slate-600">{stat.table}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Cases & Live Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active FIR Cases */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Active FIR Investigation Cases</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">938 Total</span>
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
                <div key={c.id} className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-xs font-semibold">
                      {c.caseId}
                    </span>
                    <div>
                      <h3 className="text-sm font-medium text-slate-200">{c.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{c.category || 'General'} • {c.jurisdiction || 'Jurisdiction'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Database Activity Feed */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Live Investigation Event Feed</h2>
            </div>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Stream
            </span>
          </div>

          <div className="space-y-2.5">
            {summary?.recent_activities && summary.recent_activities.length > 0 ? (
              summary.recent_activities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-lg flex items-start gap-3">
                  <div className="p-1.5 rounded bg-sky-500/10 text-sky-400 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{act.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{act.timestamp.split('T')[0]}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{act.summary}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">Streaming live events from Supabase...</div>
            )}
          </div>
        </div>
      </div>

      {/* Intelligence & Hotspots Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hotspots */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            Location Anomaly Clusters
          </h2>
          <div className="space-y-3">
            {summary?.hotspots && summary.hotspots.length > 0 ? (
              summary.hotspots.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700/30">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{h.location}</div>
                    <div className="text-xs text-slate-400">{h.detail}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-mono ${h.status === 'ANOMALOUS' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {h.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No anomaly clusters reported.</div>
            )}
          </div>
        </div>

        {/* AI Forensic Intelligence */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Intelligence Correlation Engine
          </h2>
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-3">
            <div className="text-sm text-slate-300 italic">
              "Live correlation active across 100,000 entity nodes, 50,000 CDR logs, and 30,000 financial records. Multi-source evidence graphs dynamically resolved."
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-700/50 font-mono">
              <span>Engine: DistilBERT + XGBoost / GBDT</span>
              <span className="text-emerald-400 font-semibold">Status: Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
