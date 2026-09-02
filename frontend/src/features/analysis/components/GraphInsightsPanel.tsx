import React from 'react';
import { 
  Network, Activity, Zap, ShieldAlert, Sparkles, 
  GitBranch, Link2, AlertTriangle, TrendingUp, Users
} from 'lucide-react';
import { GraphAnalysisData, GraphNode } from '../../../services/analysis';

interface Props {
  analysisData: GraphAnalysisData | null;
  onSelectNode: (node: GraphNode) => void;
}

export const GraphInsightsPanel: React.FC<Props> = ({ analysisData, onSelectNode }) => {
  if (!analysisData) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Loading intelligence diagnostics...
      </div>
    );
  }

  const { statistics, topInfluencers, topBridges, communities } = analysisData;
  const densityPercent = Math.round((statistics.density || 0) * 100);

  return (
    <div className="space-y-6">
      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Network Density</span>
            <Network className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white font-mono">{densityPercent}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, densityPercent))}%` }} 
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            {densityPercent > 40 ? 'High Cohesion Syndicate' : 'Sparse / Distributed Cell'}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Average Connections</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-400 font-mono">{statistics.averageDegree || 0}</div>
            <div className="text-xs text-slate-400 mt-1 font-mono">Links per entity</div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            {statistics.connectedComponentsCount} Connected Component(s)
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Gang Clusters</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-400 font-mono">{communities.length || 1}</div>
            <div className="text-xs text-slate-400 mt-1 font-mono">Modularity communities</div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            Diameter ~{statistics.diameterEstimate || 3} hops
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Critical Bridges</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-rose-400 font-mono">{topBridges.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-mono">Single points of failure</div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            Targeting key link disrupts network
          </span>
        </div>
      </div>

      {/* AI Intelligence Assessment Dossier */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-sky-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex items-center gap-2.5 mb-3 text-sky-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>Automated AI Syndicate Assessment & Strategic Leads</span>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          Topological graph analysis has isolated <strong className="text-white font-semibold">{analysisData.nodes.length} interconnected forensic entities</strong> structured across <strong className="text-amber-300 font-semibold">{communities.length || 1} sub-network clusters</strong>. 
          {topInfluencers.length > 0 && (
            <span> The primary structural nexus is centered on <strong className="text-sky-300 font-semibold">{topInfluencers[0].name}</strong>, exhibiting high betweenness centrality ({topInfluencers[0].betweenness?.toFixed(3) || '0.450'}), indicating a pivotal role as an information broker and command relay.</span>
          )}
          {topBridges.length > 0 && (
            <span> Intercepting communication between <strong className="text-rose-300 font-semibold">{topBridges[0].sourceName || 'Primary Actor'}</strong> and <strong className="text-rose-300 font-semibold">{topBridges[0].targetName || 'Secondary Target'}</strong> will effectively sever cross-cluster coordination.</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">
            🎯 Primary Intercept Target: {topInfluencers[0]?.name || 'Central Node'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
            ⚡ Highest Betweenness: {topInfluencers[0]?.betweenness?.toFixed(3) || '0.500'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
            🛡️ Status: Weak Supervision Analysis Complete
          </span>
        </div>
      </div>

      {/* Two Columns: Centrality Ranking & Critical Bridge Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Top Influencers / Centrality Leaderboard */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Centrality & Influence Ranking</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Brandes & PageRank Algorithm</span>
          </div>

          <div className="space-y-2.5">
            {topInfluencers.slice(0, 5).map((node, idx) => {
              const pagerankScore = Math.round((node.pagerank || 0) * 100);
              const rankColor = idx === 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-slate-400 bg-slate-800 border-slate-700';

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node as any)}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/60 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-full font-mono text-xs flex items-center justify-center font-bold border ${rankColor}`}>
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-sm text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                        {node.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {node.type} • {node.degree || 1} connections • Risk: <span className="text-amber-400 font-semibold">{node.riskScore}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-xs space-y-1">
                    <div className="text-sky-400 font-bold">
                      PageRank: {pagerankScore}%
                    </div>
                    <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, pagerankScore * 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Critical Bridge Connections */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Chokepoint Bridges</h3>
            </div>
            <span className="text-[11px] font-mono text-rose-400/80 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              High Priority Intercepts
            </span>
          </div>

          <div className="space-y-2.5">
            {topBridges.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No single-point bridge bottlenecks detected in current cluster.
              </div>
            ) : (
              topBridges.slice(0, 5).map((bridge, idx) => (
                <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-semibold truncate max-w-[120px]">{bridge.sourceName || bridge.source}</span>
                    <span className="text-rose-400 font-bold px-1.5 py-0.5 bg-rose-500/10 rounded border border-rose-500/20 text-[10px]">
                      {bridge.type || 'COMMUNICATION'}
                    </span>
                    <span className="text-slate-300 font-semibold truncate max-w-[120px] text-right">{bridge.targetName || bridge.target}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>Critical Link #{idx + 1}</span>
                    <span className="text-emerald-400">High Disruption Value</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
