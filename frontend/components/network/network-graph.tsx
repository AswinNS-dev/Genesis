"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Search,
  Target,
  Filter,
  Info,
  Layers,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { entityColor, entityLabel, relationColor, relationLabel } from "@backend/lib/colors";
import type { EdgeData } from "@backend/services/graph-analysis.service";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  radius?: number;
  caseTitle?: string | null;
  riskScore?: number;
}

export interface GraphLink {
  id?: string;
  source: string;
  target: string;
  type: string;
  color: string;
  weight: number;
  label?: string | null;
  strength?: number;
  count?: number;
  records?: string[];
}

interface FocusModeInfo {
  nodeId: string;
  nodeName: string;
  hops: number;
}

function layoutNodes(
  nodes: GraphNode[],
  links: GraphLink[]
): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  const W = 1000;
  const H = 680;
  const cx = W / 2;
  const cy = H / 2;

  // Group by type for clusters
  const byType: Record<string, GraphNode[]> = {};
  for (const n of nodes) {
    (byType[n.type] ??= []).push(n);
  }
  const types = Object.keys(byType);
  const k = types.length;
  types.forEach((t, i) => {
    const group = byType[t];
    const angle = (i / k) * Math.PI * 2 - Math.PI / 2;
    const gx = cx + Math.cos(angle) * (H / 2 - 120);
    const gy = cy + Math.sin(angle) * (H / 2 - 120);
    group.forEach((n, j) => {
      const ra = (j / Math.max(1, group.length)) * Math.PI * 2;
      const rr = 110;
      pos[n.id] = {
        x: gx + Math.cos(ra) * rr,
        y: gy + Math.sin(ra) * rr,
      };
    });
  });

  // Force relaxation
  const idxToId = nodes.map((n) => n.id);
  for (let iter = 0; iter < 60; iter++) {
    for (const l of links) {
      const a = pos[l.source];
      const b = pos[l.target];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const desired = 170;
      const force = (dist - desired) * 0.02;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.x += fx;
      a.y += fy;
      b.x -= fx;
      b.y -= fy;
    }
    for (const id of idxToId) {
      if (pos[id]) {
        pos[id].x += (cx - pos[id].x) * 0.001;
        pos[id].y += (cy - pos[id].y) * 0.001;
      }
    }
  }
  return pos;
}

export function NetworkGraph({
  nodes,
  links,
  onSelect,
  onSelectEdge,
  selectedIds = [],
  pathNodeIds = [],
  focusMode,
  onClearFocus,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect?: (nodeId: string) => void;
  onSelectEdge?: (link: GraphLink) => void;
  selectedIds?: string[];
  pathNodeIds?: string[];
  focusMode?: FocusModeInfo | null;
  onClearFocus?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const types = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.type))),
    [nodes]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes.filter((n) => {
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false;
      if (q && !n.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [nodes, query, typeFilter]);

  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible]);
  const visibleLinks = useMemo(
    () => links.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target)),
    [links, visibleIds]
  );

  const pos = useMemo(() => layoutNodes(visible, visibleLinks), [visible, visibleLinks]);

  // Build adjacency for highlighting direct connections
  const adjacency = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const l of links) {
      (map[l.source] ??= new Set()).add(l.target);
      (map[l.target] ??= new Set()).add(l.source);
    }
    return map;
  }, [links]);

  const wrap = useCallback(
    (v: number, max: number) => Math.min(max, Math.max(0.2, v)),
    []
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => wrap(z + (e.deltaY > 0 ? -0.08 : 0.08), 3));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [wrap]);

  const connectedTo = (id: string) => adjacency[id] ?? new Set<string>();
  const isDimmed = (id: string) => {
    if (pathNodeIds.length > 0) {
      return !pathNodeIds.includes(id);
    }
    return highlight !== null && id !== highlight && !connectedTo(highlight).has(id);
  };

  return (
    <div className="flex flex-col relative">
      {/* Focus Mode Banner */}
      {focusMode && (
        <div className="flex items-center justify-between bg-accent/15 border-b border-accent/30 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-accent font-semibold">
            <Target className="h-4 w-4 animate-pulse" />
            <span>
              Focus Mode: {focusMode.hops} Hop{focusMode.hops > 1 ? "s" : ""} neighborhood around{" "}
              <strong>&quot;{focusMode.nodeName}&quot;</strong>
            </span>
          </div>
          {onClearFocus && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClearFocus}
              className="h-6 text-[11px] px-2 border-accent/40 text-accent hover:bg-accent hover:text-black font-semibold"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Show Full Network
            </Button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 bg-surface-raised/20">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes in view…"
            className="h-8 w-44 rounded-md border border-border bg-surface pl-8 pr-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent md:w-56"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => wrap(z + 0.15, 3))}
            className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => wrap(z - 0.15, 3))}
            className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setHighlight(null);
            }}
            className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground"
            aria-label="Reset view"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend & Controls Info */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-1.5 text-[11px] text-muted bg-surface/50">
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" /> Drag to pan · Scroll to zoom
        </span>
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3" /> Click node or edge to inspect
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          {types.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entityColor(t) }}
              />
              {entityLabel(t)}
            </span>
          ))}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative h-[600px] overflow-hidden bg-[#090d16]">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName === "svg") {
              setHighlight(null);
            }
            const startX = e.clientX;
            const startY = e.clientY;
            const startPan = { ...pan };
            const onMove = (ev: MouseEvent) => {
              setPan({
                x: startPan.x + (ev.clientX - startX),
                y: startPan.y + (ev.clientY - startY),
              });
            };
            const onUp = () => {
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
        >
          <g
            transform={`translate(${pan.x + 500}, ${pan.y + 300}) scale(${zoom})`}
          >
            {/* Links */}
            {visibleLinks.map((l, i) => {
              const a = pos[l.source];
              const b = pos[l.target];
              if (!a || !b) return null;

              const isPathLink =
                pathNodeIds.length > 1 &&
                pathNodeIds.includes(l.source) &&
                pathNodeIds.includes(l.target);

              const dim =
                pathNodeIds.length > 0
                  ? !isPathLink
                  : highlight !== null &&
                    !(highlight === l.source || highlight === l.target);

              return (
                <g key={i} className="cursor-pointer" onClick={() => onSelectEdge && onSelectEdge(l)}>
                  {/* Invisible wide hit area */}
                  <line
                    x1={a.x - 500}
                    y1={a.y - 300}
                    x2={b.x - 500}
                    y2={b.y - 300}
                    stroke="transparent"
                    strokeWidth={12}
                  />
                  {/* Rendered line */}
                  <line
                    x1={a.x - 500}
                    y1={a.y - 300}
                    x2={b.x - 500}
                    y2={b.y - 300}
                    stroke={isPathLink ? "#f59e0b" : l.color}
                    strokeWidth={isPathLink ? 3.5 : Math.max(1.2, l.weight)}
                    strokeDasharray={isPathLink ? "6 3" : undefined}
                    opacity={dim ? 0.08 : isPathLink ? 0.95 : 0.6}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {visible.map((n) => {
              const p = pos[n.id];
              if (!p) return null;
              const x = p.x - 500;
              const y = p.y - 300;
              const dim = isDimmed(n.id);
              const isSel = selectedIds.includes(n.id);
              const isPath = pathNodeIds.includes(n.id);
              const isExp = expanded.has(n.id);
              const deg = (adjacency[n.id] ?? new Set()).size;

              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHighlight(n.id);
                    if (onSelect) onSelect(n.id);
                  }}
                  onMouseEnter={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) {
                      setHoveredNode({
                        node: n,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                  opacity={dim ? 0.12 : 1}
                >
                  {/* Path ring indicator */}
                  {isPath && (
                    <circle
                      cx={x}
                      cy={y}
                      r={(n.radius ?? 12) + 6}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      className="animate-pulse"
                    />
                  )}

                  {/* Selection indicator */}
                  {isSel && (
                    <circle
                      cx={x}
                      cy={y}
                      r={(n.radius ?? 12) + 4}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2}
                    />
                  )}

                  {/* Base Node Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={n.radius ?? 12}
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={n.color}
                    strokeWidth={isSel ? 3 : 1.8}
                  />

                  {/* Inner Type Dot */}
                  <circle cx={x} cy={y} r={4.5} fill={n.color} />

                  {/* Clean Progressive Label (only for selected/highlighted or low density) */}
                  <text
                    x={x}
                    y={y + ((n.radius ?? 12) + 13)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isSel || isPath ? "bold" : "normal"}
                    fill={isPath ? "#f59e0b" : isSel ? "#38bdf8" : dim ? "#475569" : "#cbd5e1"}
                    style={{ pointerEvents: "none" }}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-border bg-surface-raised/95 p-2.5 shadow-2xl backdrop-blur-md text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${hoveredNode.x}px`,
              top: `${hoveredNode.y - 10}px`,
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: hoveredNode.node.color }}
              />
              <span>{hoveredNode.node.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Badge variant="outline" className="text-[9px]">
                {entityLabel(hoveredNode.node.type)}
              </Badge>
              <span>{(adjacency[hoveredNode.node.id] ?? new Set()).size} Connections</span>
            </div>
            {hoveredNode.node.caseTitle && (
              <p className="text-[10px] text-accent truncate max-w-[200px]">
                {hoveredNode.node.caseTitle}
              </p>
            )}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            No entities match the selected network filters.
          </div>
        ) : null}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted bg-surface">
        <div className="flex items-center gap-3">
          <span>{visible.length} Entities</span>
          <span>•</span>
          <span>{visibleLinks.length} Connections</span>
        </div>
        <span>Click node or edge for detailed intelligence</span>
      </div>
    </div>
  );
}
