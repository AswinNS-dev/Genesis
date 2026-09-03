import React, { useState } from 'react';
import { 
  GitMerge, ArrowRight, Search, Zap, AlertCircle, 
  CheckCircle, Route, CornerDownRight, User
} from 'lucide-react';
import { GraphNode, analysisService } from '../../../services/analysis';

interface Props {
  nodes: GraphNode[];
  onHighlightPath: (pathIds: string[]) => void;
}

export const PathFinderVisualizer: React.FC<Props> = ({ nodes, onHighlightPath }) => {
  const [sourceId, setSourceId] = useState<string>(nodes[0]?.id || '');
  const [targetId, setTargetId] = useState<string>(nodes[nodes.length - 1]?.id || '');
  const [searching, setSearching] = useState(false);
  const [pathResult, setPathResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFindPath = async () => {
    if (!sourceId || !targetId) {
      setError('Please select both a source entity and a target entity.');
      return;
    }
    if (sourceId === targetId) {
      setError('Source and target cannot be the same entity.');
      return;
    }

    setError(null);
    setSearching(true);
    try {
      const res = await analysisService.findShortestPath(sourceId, targetId);
      setPathResult(res);

      if (res?.path && Array.isArray(res.path)) {
        onHighlightPath(res.path);
      } else if (res?.nodes && Array.isArray(res.nodes)) {
        onHighlightPath(res.nodes.map((n: any) => n.id || n));
      }
    } catch (err: any) {
      setError(err?.message || 'No direct or intermediate path found between selected entities.');
      setPathResult(null);
      onHighlightPath([]);
    } finally {
      setSearching(false);
    }
  };

  const getEntityName = (id: string) => {
    const node = nodes.find(n => n.id === id);
    return node ? node.label : id;
  };

  const getEntityType = (id: string) => {
    const node = nodes.find(n => n.id === id);
    return node ? node.type : 'ENTITY';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-wide">Path & Link Route Finder</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Discover hidden connection chains, money trails, and communication hops between suspects.
          </p>
        </div>
        <span className="text-[11px] font-mono bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-md border border-sky-500/20">
          Dijkstra & BFS Path Engine
        </span>
      </div>

      {/* Selectors and Action */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold uppercase">Source Entity (Origin)</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
          >
            {nodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.label} [{n.type}] — {n.riskScore}% Risk
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold uppercase">Target Entity (Destination)</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
          >
            {nodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.label} [{n.type}] — {n.riskScore}% Risk
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            onClick={handleFindPath}
            disabled={searching}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{searching ? 'Tracing...' : 'Trace Path'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Path Result Display */}
      {pathResult && (
        <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/80 pb-3">
            <span className="flex items-center gap-1.5 font-bold text-sky-400">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Connection Path Discovered
            </span>
            <span>
              Total Degrees of Separation: <strong className="text-white">{(pathResult.path?.length || pathResult.nodes?.length || 2) - 1} hops</strong>
            </span>
          </div>

          {/* Visual Step-by-Step Hop Pipeline */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {(pathResult.path || pathResult.nodes || [sourceId, targetId]).map((stepId: any, idx: number, arr: any[]) => {
              const entityId = typeof stepId === 'object' ? stepId.id : stepId;
              const name = getEntityName(entityId);
              const type = getEntityType(entityId);
              const isLast = idx === arr.length - 1;

              return (
                <React.Fragment key={idx}>
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center gap-2 shadow-md">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-white font-semibold block">{name}</span>
                      <span className="text-[10px] text-slate-400">{type}</span>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="flex items-center text-sky-400 font-bold px-1 animate-pulse">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            💡 The discovered chain of connection is automatically highlighted on the <strong>Link Network Graph</strong> with a cyan glowing trail.
          </div>
        </div>
      )}
    </div>
  );
};
