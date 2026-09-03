import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Filter, Maximize2, 
  User, Phone, Car, MapPin, Building, CreditCard, 
  Sparkles, ShieldAlert, Layers, Search, Eye
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../../services/analysis';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  highlightedPath?: string[];
}

export const InteractiveGraphCanvas: React.FC<Props> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  highlightedPath = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [minRisk, setMinRisk] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Position calculation with pseudo-force layout around center
  const calculatedPositions = useMemo(() => {
    const width = 800;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;
    const count = nodes.length;

    if (count === 0) return {};

    const pos: Record<string, { x: number; y: number }> = {};

    // Group by communities or circular distribution
    nodes.forEach((node, idx) => {
      const angle = (idx / count) * 2 * Math.PI;
      // High degree nodes closer to center, lower degree further out
      const degree = node.degree || 1;
      const radius = Math.max(90, 240 - degree * 20) + (idx % 2 === 0 ? 0 : 40);
      
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      pos[node.id] = { x, y };
    });

    return pos;
  }, [nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesType = typeFilter === 'ALL' || (n.type || '').toUpperCase() === typeFilter;
      const matchesRisk = (n.riskScore || 0) >= minRisk;
      const matchesSearch = !searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesRisk && matchesSearch;
    });
  }, [nodes, typeFilter, minRisk, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(2.5, Math.max(0.4, prev + delta)));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTypeFilter('ALL');
    setMinRisk(0);
    setSearchQuery('');
  };

  const getNodeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PERSON':
      case 'SUSPECT':
        return User;
      case 'PHONE':
        return Phone;
      case 'VEHICLE':
        return Car;
      case 'LOCATION':
        return MapPin;
      case 'ORGANIZATION':
      case 'COMPANY':
        return Building;
      case 'BANK_ACCOUNT':
      case 'TRANSACTION':
        return CreditCard;
      default:
        return Sparkles;
    }
  };

  const getNodeColors = (node: GraphNode) => {
    const risk = node.riskScore || 0;
    const isSelected = selectedNodeId === node.id;
    const isPath = highlightedPath.includes(node.id);

    if (isSelected || isPath) {
      return {
        fill: '#0284c7',
        stroke: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.6)',
        text: '#ffffff'
      };
    }

    if (risk >= 75) {
      return {
        fill: '#7f1d1d',
        stroke: '#f87171',
        glow: 'rgba(248, 113, 113, 0.4)',
        text: '#fca5a5'
      };
    } else if (risk >= 45) {
      return {
        fill: '#78350f',
        stroke: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.3)',
        text: '#fde68a'
      };
    } else {
      return {
        fill: '#0c4a6e',
        stroke: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.2)',
        text: '#bae6fd'
      };
    }
  };

  return (
    <div className="relative w-full h-[580px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden select-none flex flex-col">
      {/* Top Toolbar */}
      <div className="absolute top-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search node..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 font-mono"
            />
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Types</option>
            <option value="PERSON">Persons</option>
            <option value="PHONE">Phones</option>
            <option value="VEHICLE">Vehicles</option>
            <option value="LOCATION">Locations</option>
            <option value="ORGANIZATION">Orgs</option>
            <option value="BANK_ACCOUNT">Accounts</option>
          </select>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 px-2 text-xs font-mono text-slate-400">
            <span className="text-[10px]">Risk ≥ {minRisk}%</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minRisk}
              onChange={(e) => setMinRisk(Number(e.target.value))}
              className="w-16 accent-sky-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Zoom & Reset Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl">
          <button
            onClick={() => handleZoom(0.2)}
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            title="Reset View"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full flex-1 cursor-grab active:cursor-grabbing relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 800 550"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" opacity="0.6" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {filteredEdges.map((edge) => {
              const src = calculatedPositions[edge.source];
              const tgt = calculatedPositions[edge.target];
              if (!src || !tgt) return null;

              const isHighlighted =
                selectedNodeId === edge.source ||
                selectedNodeId === edge.target ||
                (highlightedPath.includes(edge.source) && highlightedPath.includes(edge.target));

              const strokeColor = isHighlighted ? '#38bdf8' : '#334155';
              const strokeWidth = isHighlighted ? 2.5 : Math.max(1, (edge.strength || 10) / 25);
              const opacity = isHighlighted ? 0.9 : 0.45;

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g key={edge.id || `${edge.source}-${edge.target}`}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    markerEnd="url(#arrow)"
                    strokeDasharray={edge.type === 'COMMUNICATION' ? '4 3' : 'none'}
                  />
                  {isHighlighted && edge.label && (
                    <text
                      x={midX}
                      y={midY - 4}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const pos = calculatedPositions[node.id] || { x: 400, y: 275 };
              const colors = getNodeColors(node);
              const Icon = getNodeIcon(node.type);
              const isSelected = selectedNodeId === node.id;
              const radius = isSelected ? 24 : 19;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(isSelected ? null : node);
                  }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer transition-transform"
                >
                  {/* Outer Glow Halo for high risk or selected */}
                  {(node.riskScore > 60 || isSelected) && (
                    <circle
                      r={radius + 8}
                      fill={colors.glow}
                      filter="url(#glow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Circle */}
                  <circle
                    r={radius}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 3 : 2}
                  />

                  {/* Icon Representation */}
                  <foreignObject
                    x={-10}
                    y={-10}
                    width={20}
                    height={20}
                    className="pointer-events-none"
                  >
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </foreignObject>

                  {/* Node Label Below */}
                  <text
                    y={radius + 14}
                    fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                    fontSize={isSelected ? '12' : '11'}
                    fontWeight={isSelected ? '700' : '500'}
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    className="select-none pointer-events-none drop-shadow"
                  >
                    {node.label}
                  </text>

                  {/* Type / Risk Tag */}
                  <text
                    y={radius + 26}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {node.type} • {node.riskScore}%
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Quick Card Popup */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none max-w-xs font-mono text-xs space-y-1">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white font-sans text-sm truncate">{hoveredNode.label}</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">{hoveredNode.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-300">
              <div>Risk Index: <span className="text-amber-400 font-bold">{hoveredNode.riskScore}%</span></div>
              <div>Connections: <span className="text-sky-400 font-bold">{hoveredNode.degree || 1} links</span></div>
              <div>PageRank: <span className="text-slate-200">{hoveredNode.pagerank ? (hoveredNode.pagerank * 100).toFixed(1) + '%' : 'N/A'}</span></div>
              <div>Betweenness: <span className="text-slate-200">{hoveredNode.betweenness ? hoveredNode.betweenness.toFixed(3) : 'N/A'}</span></div>
            </div>
            <div className="text-[10px] text-slate-500 pt-1">Click node to open Forensic Dossier</div>
          </div>
        )}
      </div>

      {/* Bottom Legend Bar */}
      <div className="px-5 py-2.5 bg-slate-900/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Threat (&gt;75%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Verified Entity
          </span>
        </div>
        <div>
          Showing {filteredNodes.length} of {nodes.length} entities • {filteredEdges.length} link relations
        </div>
      </div>
    </div>
  );
};
