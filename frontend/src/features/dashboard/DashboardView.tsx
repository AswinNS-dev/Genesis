import React from 'react';
import { ShieldCheck, Users, FolderKanban, Activity, AlertTriangle } from 'lucide-react';

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Executive Intelligence Overview</h1>
        <p className="text-sm text-slate-400">Real-time status across ongoing criminal investigation dockets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Active Cases</span>
            <FolderKanban className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">12</div>
          <span className="text-xs text-emerald-400 font-medium">3 high priority</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Tracked Entities</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">1,420</div>
          <span className="text-xs text-slate-400 font-medium">Persons, vehicles, phones</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Blockchain Blocks</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">INTACT</div>
          <span className="text-xs text-slate-400 font-medium">100% verified integrity</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">AI Pattern Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">8</div>
          <span className="text-xs text-amber-400/80 font-medium">Anomalies flagged</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Investigation Lead Generator
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-slate-200">PRIORITY LEAD: Entity 892</span>
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">HIGH</span>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                <strong>Why was this flagged?</strong> The entities have communicated 145 times, which is highly significant. This pattern may warrant further investigation.
              </p>
              <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                Supporting Evidence: call_records.csv (Entity found in caller_person_id)
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-slate-200">PRIORITY LEAD: Entity 112</span>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">MEDIUM</span>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                <strong>Why was this flagged?</strong> There are 45 recorded financial transactions between these entities. This pattern may warrant further investigation.
              </p>
              <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                Supporting Evidence: financial_transactions.csv (Cross-referenced)
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Location Analysis Engine
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700/30">
                <div>
                  <div className="text-sm font-medium text-slate-200">Hotspot: Sector 4 Industrial</div>
                  <div className="text-xs text-slate-400">High co-location density (42 events)</div>
                </div>
                <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded">ANOMALOUS</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700/30">
                <div>
                  <div className="text-sm font-medium text-slate-200">Hotspot: Harbor Warehouse B</div>
                  <div className="text-xs text-slate-400">Unusual night activity (88% night visits)</div>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">REVIEW</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-400" />
              AI Investigation Summarizer
            </h2>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="text-sm text-slate-300 italic mb-3">
                "Investigation CASE-892 involves a HIGH priority narcotics incident at Harbor Warehouse B. Intelligence has linked the following individuals: P-991, P-042. The incident was described as an unusual gathering involving multiple vehicles at 2:00 AM."
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Model: google/flan-t5-small</span>
                <span className="text-emerald-500 font-medium">Confidence: 94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

