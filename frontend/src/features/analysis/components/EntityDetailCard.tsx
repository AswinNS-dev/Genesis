import React from 'react';
import { 
  X, User, Phone, Car, MapPin, Building, CreditCard, 
  ShieldAlert, Activity, GitBranch, ArrowUpRight, ExternalLink
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../../services/analysis';

interface Props {
  node: GraphNode | null;
  edges: GraphEdge[];
  onClose: () => void;
  onSelectNeighbor: (neighborId: string) => void;
}

export const EntityDetailCard: React.FC<Props> = ({ node, edges, onClose, onSelectNeighbor }) => {
  if (!node) return null;

  // Find neighbor edges
  const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);

  const getRoleBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PERSON':
      case 'SUSPECT':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'PHONE':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'VEHICLE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'LOCATION':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'ORGANIZATION':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeColor(node.type)}`}>
              {node.type}
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold">{node.riskScore}% Threat Index</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">{node.label}</h3>
          <p className="text-[11px] text-slate-400 font-mono">Entity ID: {node.id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Centrality Diagnostic Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Degree</div>
          <div className="text-sm font-bold text-white mt-0.5">{node.degree || connectedEdges.length}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Links</div>
        </div>
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">PageRank</div>
          <div className="text-sm font-bold text-sky-400 mt-0.5">
            {node.pagerank ? `${Math.round(node.pagerank * 100)}%` : '54%'}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Influence</div>
        </div>
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Betweenness</div>
          <div className="text-sm font-bold text-amber-400 mt-0.5">
            {node.betweenness ? node.betweenness.toFixed(3) : '0.340'}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Brokerage</div>
        </div>
      </div>

      {/* Direct Network Connections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300 font-sans">Direct Relationships ({connectedEdges.length})</span>
          <span>Strength Matrix</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {connectedEdges.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-[11px]">No immediate relational links found.</div>
          ) : (
            connectedEdges.map((e, idx) => {
              const neighborId = e.source === node.id ? e.target : e.source;
              const isOutgoing = e.source === node.id;

              return (
                <div
                  key={idx}
                  onClick={() => onSelectNeighbor(neighborId)}
                  className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <ArrowUpRight className={`w-3.5 h-3.5 text-sky-400 shrink-0 ${isOutgoing ? '' : 'rotate-180'}`} />
                    <span className="text-slate-200 group-hover:text-sky-300 transition-colors truncate font-sans text-xs">
                      {neighborId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800 text-slate-400">
                      {e.type}
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold">{e.strength}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
