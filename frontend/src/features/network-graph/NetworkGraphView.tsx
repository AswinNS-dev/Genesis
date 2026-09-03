import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { visualizationsService, NetworkExplorerNode, NetworkExplorerEdge } from '../../services/visualizations';
import { 
  Network, 
  Search, 
  Layers, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  RefreshCw, 
  RotateCcw,
  Database, 
  Phone, 
  Car, 
  MapPin, 
  FileText, 
  Route, 
  Users, 
  GitFork, 
  Activity, 
  Sparkles, 
  Radio, 
  FolderLock,
  ArrowRight,
  Shield,
  Clock,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const NetworkGraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Mode
  const [activeMode, setActiveMode] = useState<
    'EXPLORER' | 'SHORTEST_PATH' | 'CONNECTION_PATH' | 'COMMUNITIES' | 'CENTRALITY' | 'TIMELINE' | 'AI_INSIGHTS'
  >('EXPLORER');

  // Graph Data
  const [allNodes, setAllNodes] = useState<NetworkExplorerNode[]>([]);
  const [allEdges, setAllEdges] = useState<NetworkExplorerEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Inspector
  const [selectedNode, setSelectedNode] = useState<NetworkExplorerNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkExplorerEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkExplorerNode | null>(null);

  // Focus Mode
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusHops, setFocusHops] = useState<number>(2);

  // Pathfinding
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [pathResultSteps, setPathResultSteps] = useState<Array<{ from: string; to: string; type: string; detail?: string }>>([]);
  const [pathSearched, setPathSearched] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('All Categories');
  const [minRisk, setMinRisk] = useState(0);
  const [showLegend, setShowLegend] = useState(true);

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });

  // Responsive Canvas Sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setCanvasDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await visualizationsService.getNetworkExplorer({
        search: searchQuery || undefined,
        entity_type: entityTypeFilter !== 'All Categories' ? entityTypeFilter : undefined,
        min_risk: minRisk > 0 ? minRisk : undefined,
        focus_id: focusNodeId || undefined,
        hops: focusHops,
        limit: 220
      });

      // Distribute nodes physically
      const cx = canvasDimensions.width / 2;
      const cy = canvasDimensions.height / 2;
      const count = res.nodes.length || 1;

      const placedNodes = res.nodes.map((n, idx) => {
        const angle = (idx / count) * 2 * Math.PI + (idx % 4) * 0.5;
        const dist = 70 + (idx % 6) * 45 + Math.random() * 25;
        return {
          ...n,
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
        };
      });

      setAllNodes(placedNodes);
      setAllEdges(res.edges);

      if (placedNodes.length > 0) {
        if (!selectedNode || !placedNodes.find(n => n.id === selectedNode.id)) {
          setSelectedNode(placedNodes[0]);
        }
      } else {
        setSelectedNode(null);
      }
    } catch (err: any) {
      console.error('Network graph fetch error:', err);
      setError('Unable to retrieve network graph records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [entityTypeFilter, minRisk, focusNodeId, focusHops]);

  // Entity Type Color Palette (Neutral Law-Enforcement Colors)
  const getEntityTypeColor = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'PERSON':
        return '#06b6d4'; // Cyan
      case 'PHONE':
        return '#3b82f6'; // Blue
      case 'VEHICLE':
        return '#a855f7'; // Purple
      case 'LOCATION':
        return '#f59e0b'; // Amber
      case 'FIR':
      case 'CASE':
        return '#ec4899'; // Pink/Magenta
      case 'FINANCIAL':
        return '#10b981'; // Emerald
      default:
        return '#64748b'; // Slate
    }
  };

  // Canvas Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Transform coordinate system
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // 1. Draw Edges
      allEdges.forEach((e) => {
        const src = allNodes.find((n) => n.id === e.source);
        const tgt = allNodes.find((n) => n.id === e.target);
        if (!src || !tgt || !src.x || !src.y || !tgt.x || !tgt.y) return;

        const isPath = highlightedPath.includes(e.source) && highlightedPath.includes(e.target);
        const isSelected = selectedEdge?.id === e.id || (selectedNode && (selectedNode.id === e.source || selectedNode.id === e.target));

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (isPath) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
        } else if (isSelected) {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 2. Draw Nodes
      allNodes.forEach((n) => {
        if (!n.x || !n.y) return;
        const isSelected = selectedNode?.id === n.id;
        const isHovered = hoveredNode?.id === n.id;
        const isPathNode = highlightedPath.includes(n.id);
        const radius = isSelected ? 8 : isHovered ? 7 : (n.type === 'PERSON' ? 5.5 : 4.5);

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = getEntityTypeColor(n.type);

        if (isSelected || isPathNode) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        } else if (isHovered) {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Display label only for selected, hovered, path node, or top connected nodes
        if (isSelected || isHovered || isPathNode || (n.degree && n.degree >= 3)) {
          ctx.font = '10px monospace';
          ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
          ctx.fillText(n.label || n.id, n.x + radius + 4, n.y + 3);
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [allNodes, allEdges, selectedNode, selectedEdge, hoveredNode, zoom, pan, highlightedPath, canvasDimensions]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
    const mouseY = (e.clientY - rect.top - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

    const found = allNodes.find((n) => {
      if (!n.x || !n.y) return false;
      const dist = Math.sqrt((n.x - mouseX) ** 2 + (n.y - mouseY) ** 2);
      return dist <= 12;
    });

    setHoveredNode(found || null);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      setSelectedEdge(null);
    }
  };

  // Connected Neighbors for Selected Node
  const directConnectedNeighbors = useMemo(() => {
    if (!selectedNode) return [];
    const neighbors: Array<{ node: NetworkExplorerNode; edge: NetworkExplorerEdge }> = [];
    allEdges.forEach((e) => {
      if (e.source === selectedNode.id) {
        const tgt = allNodes.find((n) => n.id === e.target);
        if (tgt) neighbors.push({ node: tgt, edge: e });
      } else if (e.target === selectedNode.id) {
        const src = allNodes.find((n) => n.id === e.source);
        if (src) neighbors.push({ node: src, edge: e });
      }
    });
    return neighbors;
  }, [selectedNode, allEdges, allNodes]);

  // BFS Shortest Path Execution across Full Graph
  const runShortestPath = (srcId: string, tgtId: string) => {
    if (!srcId || !tgtId || srcId === tgtId) return;
    setPathSearched(true);

    const adj: Record<string, Array<{ target: string; edge: NetworkExplorerEdge }>> = {};
    allEdges.forEach((e) => {
      if (!adj[e.source]) adj[e.source] = [];
      if (!adj[e.target]) adj[e.target] = [];
      adj[e.source].push({ target: e.target, edge: e });
      adj[e.target].push({ target: e.source, edge: e });
    });

    const queue: Array<{ path: string[]; edges: NetworkExplorerEdge[] }> = [{ path: [srcId], edges: [] }];
    const visited = new Set<string>([srcId]);
    let foundPath: string[] = [];
    let foundEdges: NetworkExplorerEdge[] = [];

    while (queue.length > 0) {
      const { path, edges } = queue.shift()!;
      const current = path[path.length - 1];

      if (current === tgtId) {
        foundPath = path;
        foundEdges = edges;
        break;
      }

      for (const neighbor of adj[current] || []) {
        if (!visited.has(neighbor.target)) {
          visited.add(neighbor.target);
          queue.push({
            path: [...path, neighbor.target],
            edges: [...edges, neighbor.edge]
          });
        }
      }
    }

    if (foundPath.length > 0) {
      setHighlightedPath(foundPath);
      const steps = foundEdges.map((e, idx) => ({
        from: foundPath[idx],
        to: foundPath[idx + 1],
        type: e.type,
        detail: e.supportingDetail || e.supportingRecord
      }));
      setPathResultSteps(steps);
    } else {
      setHighlightedPath([]);
      setPathResultSteps([]);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-100 pb-8 flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Scope Header */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white tracking-wide">Criminal Network Analysis & Link Explorer</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/40 text-cyan-400">
            Real Database Graph
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{allNodes.length} Nodes</span>
          <span>•</span>
          <span>{allEdges.length} Edges</span>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl backdrop-blur-md text-xs font-medium">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveMode('EXPLORER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'EXPLORER' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" /> Graph Explorer
          </button>

          <button
            onClick={() => {
              setActiveMode('SHORTEST_PATH');
              setPathSearched(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'SHORTEST_PATH' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Route className="w-3.5 h-3.5" /> Path Finder
          </button>

          <button
            onClick={() => setActiveMode('COMMUNITIES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'COMMUNITIES' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Communities
          </button>

          <button
            onClick={() => setActiveMode('CENTRALITY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'CENTRALITY' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Centrality Ranks
          </button>
        </div>

        <div className="flex items-center gap-2">
          {focusNodeId && (
            <button
              onClick={() => {
                setFocusNodeId(null);
                setHighlightedPath([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-400 border border-amber-600/40 rounded-lg text-xs font-mono font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> Restore Full Network
            </button>
          )}

          <button
            onClick={fetchGraph}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suspect name, crime type (e.g. Fraud, Theft), FIR docket, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGraph()}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Entity Type Filter */}
        <div>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option>All Categories</option>
            <option>PERSON</option>
            <option>PHONE</option>
            <option>VEHICLE</option>
            <option>LOCATION</option>
            <option>FIR</option>
          </select>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={fetchGraph}
            className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Main Graph Canvas & Telemetry Panel (Responsive Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[540px]">
        {/* Graph Canvas Container */}
        <div 
          ref={containerRef}
          className="lg:col-span-2 bg-slate-950 border border-slate-800/90 rounded-xl relative overflow-hidden flex flex-col shadow-inner min-h-[500px]"
        >
          {/* Top Status Overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg text-[10px] font-mono text-slate-300 backdrop-blur-md">
            <span className="text-cyan-400 font-bold">{allNodes.length} NODES</span>
            <span className="text-slate-600">/</span>
            <span className="text-purple-400 font-bold">{allEdges.length} EDGES</span>
            <span className="text-slate-600">•</span>
            <span>Click Node for Telemetry</span>
          </div>

          {/* Empty Search State */}
          {allNodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
              <div className="text-sm font-bold text-white">No Matching Entities or Connections Found</div>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                No database records matched your search query &quot;{searchQuery}&quot;. Try clearing filters or searching another crime type or entity name.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setEntityTypeFilter('All Categories');
                  fetchGraph();
                }}
                className="mt-3 px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs"
              >
                Clear Search & Reset
              </button>
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Legend */}
          {showLegend && (
            <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono backdrop-blur-md space-y-1 shadow-md">
              <div className="font-bold text-slate-300 flex justify-between gap-4 pb-1 border-b border-slate-800">
                <span>ENTITY TYPES</span>
                <button onClick={() => setShowLegend(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400" /> PERSON</span>
                <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500" /> PHONE (CDR)</span>
                <span className="flex items-center gap-1.5 text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-500" /> VEHICLE</span>
                <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> LOCATION</span>
                <span className="flex items-center gap-1.5 text-pink-400"><span className="w-2 h-2 rounded-full bg-pink-500" /> FIR CASE</span>
                <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> FINANCIAL</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right-Side Telemetry / Dossier / Inspector Drawer */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between overflow-y-auto max-h-[580px]">
          {/* Path Mode Active View */}
          {activeMode === 'SHORTEST_PATH' ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Route className="w-4 h-4 text-cyan-400" />
                  BFS Shortest Path Finder
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Trace real investigative connections between any two entities
                </p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Source Entity (Origin):</label>
                  <select
                    value={pathSource || ''}
                    onChange={(e) => setPathSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="">Select Source Node</option>
                    {allNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.label || n.id} ({n.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Target Entity (Destination):</label>
                  <select
                    value={pathTarget || ''}
                    onChange={(e) => setPathTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="">Select Target Node</option>
                    {allNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.label || n.id} ({n.type})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => pathSource && pathTarget && runShortestPath(pathSource, pathTarget)}
                  disabled={!pathSource || !pathTarget}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Calculate Connection Path
                </button>
              </div>

              {pathResultSteps.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Found {pathResultSteps.length} hop connection path:
                  </div>
                  <div className="space-y-1.5">
                    {pathResultSteps.map((step, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                          <span>{allNodes.find(n => n.id === step.from)?.label || step.from}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span>{allNodes.find(n => n.id === step.to)?.label || step.to}</span>
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono font-semibold">{step.type}</div>
                        {step.detail && (
                          <div className="text-[10px] text-slate-400 font-mono">{step.detail}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : pathSearched && pathSource && pathTarget && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-2">
                  <div className="text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    No direct path in current cluster
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                    Both entities exist in the database, but no recorded link connects them within the current investigation dataset.
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                    Tip: Click each entity to view their separate direct links in the graph explorer.
                  </div>
                </div>
              )}
            </div>
          ) : selectedNode ? (
            /* Selected Node Inspector */
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <span 
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase"
                    style={{ 
                      backgroundColor: `${getEntityTypeColor(selectedNode.type)}20`,
                      color: getEntityTypeColor(selectedNode.type) 
                    }}
                  >
                    {selectedNode.type}
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">{selectedNode.label || selectedNode.id}</h2>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {selectedNode.id}</p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Connections</div>
                  <div className="text-base font-bold font-mono text-cyan-400">
                    {selectedNode.degree || directConnectedNeighbors.length}
                  </div>
                </div>
              </div>

              {/* Focus Subgraph Action */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setFocusNodeId(selectedNode.id);
                    setFocusHops(2);
                  }}
                  className="p-2 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-600/40 text-cyan-400 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Focus 2-Hops
                </button>

                <button
                  onClick={() => {
                    setPathSource(selectedNode.id);
                    setActiveMode('SHORTEST_PATH');
                    setPathSearched(false);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <Route className="w-3.5 h-3.5" /> Path Endpoint
                </button>
              </div>

              {/* Factual Record Details */}
              <div className="space-y-2 text-xs font-mono">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  Database Record Attributes
                </div>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                  {selectedNode.phone && (
                    <div className="flex justify-between text-slate-400">
                      <span>Phone:</span>
                      <span className="text-slate-200">{selectedNode.phone}</span>
                    </div>
                  )}
                  {selectedNode.vehicle && (
                    <div className="flex justify-between text-slate-400">
                      <span>Vehicle:</span>
                      <span className="text-slate-200">{selectedNode.vehicle}</span>
                    </div>
                  )}
                  {selectedNode.location && (
                    <div className="flex justify-between text-slate-400">
                      <span>Location:</span>
                      <span className="text-slate-200">{selectedNode.location}</span>
                    </div>
                  )}
                  {selectedNode.caseId && (
                    <div className="flex justify-between text-slate-400">
                      <span>Case ID:</span>
                      <span className="text-cyan-400">{selectedNode.caseId}</span>
                    </div>
                  )}
                  {selectedNode.crimeType && (
                    <div className="flex justify-between text-slate-400">
                      <span>Classification:</span>
                      <span className="text-slate-200">{selectedNode.crimeType}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Database Status:</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                </div>
              </div>

              {/* Direct Evidence Connections */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Direct Relationships</span>
                  <span className="font-mono text-cyan-400">{directConnectedNeighbors.length}</span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {directConnectedNeighbors.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 font-mono text-[11px] bg-slate-950/50 rounded">
                      No connected neighbors in current filter.
                    </div>
                  ) : (
                    directConnectedNeighbors.map(({ node: nb, edge: ed }) => (
                      <div
                        key={nb.id}
                        onClick={() => {
                          setSelectedNode(nb);
                          setSelectedEdge(ed);
                        }}
                        className="p-2 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 rounded-lg cursor-pointer transition-colors space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium truncate max-w-[140px] text-xs">
                            {nb.label || nb.id}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400">{ed.type}</span>
                        </div>
                        {ed.supportingDetail && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">{ed.supportingDetail}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Link to Report */}
              <div className="pt-2 border-t border-slate-800">
                <a
                  href="/reports"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> View Case Intelligence Report
                </a>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Layers className="w-10 h-10 text-slate-700" />
              <div className="text-xs font-mono uppercase text-slate-400">
                Select any entity node to inspect investigative relationships
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
