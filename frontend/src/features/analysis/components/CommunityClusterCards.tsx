import React from 'react';
import { Users, Shield, Zap, ArrowRight, Share2, Layers } from 'lucide-react';
import { GraphAnalysisData, GraphNode } from '../../../services/analysis';

interface Props {
  analysisData: GraphAnalysisData | null;
  onSelectNode: (node: GraphNode) => void;
}

export const CommunityClusterCards: React.FC<Props> = ({ analysisData, onSelectNode }) => {
  if (!analysisData) return null;

  const { communities, nodes } = analysisData;

  const getClusterColor = (idx: number) => {
    const colors = [
      { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
      { border: 'border-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300' },
      { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
      { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Detected Criminal Syndicates & Modularity Clusters
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic community clustering identifying segregated operations, supply cells, and laundering rings.
          </p>
        </div>
        <span className="text-xs font-mono bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg border border-purple-500/20">
          {communities.length || 1} Independent Cell(s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(communities.length > 0 ? communities : [
          { id: 1, name: 'Core Cyber Syndicate Cell #1', size: nodes.length, nodes: nodes.map(n => n.id) }
        ]).map((cluster, idx) => {
          const color = getClusterColor(idx);
          const clusterNodes = nodes.filter(n => cluster.nodes?.includes(n.id) || !cluster.nodes);
          const avgRisk = Math.round(
            clusterNodes.reduce((acc, curr) => acc + (curr.riskScore || 0), 0) / (clusterNodes.length || 1)
          );

          return (
            <div
              key={cluster.id || idx}
              className={`p-5 rounded-2xl bg-slate-900/70 border ${color.border} shadow-xl backdrop-blur-md space-y-4 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border ${color.badge}`}>
                    Cluster #{idx + 1}
                  </span>
                  <div className="text-right font-mono text-xs text-slate-400">
                    Avg Risk: <strong className="text-amber-400">{avgRisk}%</strong>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-white">{cluster.name || `Syndicate Division ${idx + 1}`}</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {clusterNodes.length} active forensic entities mapped
                </p>

                {/* Member Nodes Preview */}
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Key Operatives:</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {clusterNodes.slice(0, 5).map(node => (
                      <div
                        key={node.id}
                        onClick={() => onSelectNode(node)}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <span className="text-xs font-medium text-slate-200 group-hover:text-sky-300 truncate font-sans">
                          {node.label}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 shrink-0 font-semibold">
                          {node.riskScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Cohesion Index: High</span>
                <span className="text-sky-400 flex items-center gap-1">
                  Isolated Cell
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
