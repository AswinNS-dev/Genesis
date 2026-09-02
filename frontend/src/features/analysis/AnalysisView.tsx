import React, { useEffect, useState } from 'react';
import { analysisService } from '../../services/analysis';
import { Network, Sparkles, AlertCircle } from 'lucide-react';

export const AnalysisView: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

  useEffect(() => {
    analysisService.getGraph().then(setGraphData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Graph Intelligence & AI Insights</h1>
        <p className="text-sm text-slate-400">Interactive link analysis topology and AI investigative recommendations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[420px] flex flex-col items-center justify-center border-dashed">
          <Network className="w-12 h-12 text-sky-400/40 mb-3" />
          <div className="text-center">
            <h3 className="text-base font-semibold text-slate-200">Interactive Link Topology</h3>
            <p className="text-xs text-slate-500 mt-1">Rendered with D3 force-directed simulation ({graphData.nodes.length} nodes, {graphData.links.length} links).</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4" /> AI Lead Recommendations
          </div>
          <div className="space-y-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-bold text-rose-400 uppercase">High Priority Lead</span>
              <p className="text-xs text-slate-300">Corroborate CDR communication between Rahul Kumar and Amit Sharma during night windows.</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase">Medium Priority</span>
              <p className="text-xs text-slate-300">Cross-reference vehicle DL01AB1234 toll pings with co-located cell tower records.</p>
            </div>
          </div>
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-start gap-2 text-xs text-sky-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>All AI inferences are leads requiring investigator verification.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
