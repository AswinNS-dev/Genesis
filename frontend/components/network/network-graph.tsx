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
} from "lucide-react";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  radius?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  color: string;
  weight: number;
  label?: string;
}

// Simple deterministic layout — circular with cluster grouping to avoid jitter.
// Falls back gracefully for the prototype (deterministic, no animation drift).
function layoutNodes(
  nodes: GraphNode[],
  links: GraphLink[]
): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  const W = 1000;
  const H = 680;
  const cx = W / 2;
  const cy = H / 2;

  // Group by type for clusters.
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
      const ra = (j / group.length) * Math.PI * 2;
      const rr = 110;
      pos[n.id] = {
        x: gx + Math.cos(ra) * rr,
        y: gy + Math.sin(ra) * rr,
      };
    });
  });

  // Simple relaxation to keep linked nodes together (deterministic, few passes).
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
    // soft centering
    for (const id of idxToId) {
      pos[id].x += (cx - pos[id].x) * 0.001;
      pos[id].y += (cy - pos[id].y) * 0.001;
    }
  }
  return pos;
}

export function NetworkGraph({
  nodes,
  links,
  onSelect,
  selectedIds = [],
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect?: (nodeId: string) => void;
  selectedIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const types = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.type))),
    [nodes]
  );

  // Expand what's visible: query + type filter.
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

  // Build adjacency for highlighting (direct connections).
  const adjacency = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const l of links) {
      (map[l.source] ??= new Set()).add(l.target);
      (map[l.target] ??= new Set()).add(l.source);
    }
    return map;
  }, [links]);

  const wrap = useCallback(
    (v: number, max: number) => Math.min(max, Math.max(0, v)),
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
  const isDimmed = (id: string) =>
    highlight !== null && id !== highlight && !connectedTo(highlight).has(id);

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="h-8 w-44 rounded-md border border-border bg-surface pl-8 pr-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 md:w-56"
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" /> Drag to pan · scroll to zoom
        </span>
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3" /> Click a node to inspect
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          {types.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: nodes.find((n) => n.type === t)?.color }}
              />
              {t.toLowerCase()}
            </span>
          ))}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative h-[560px] overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
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
            transform={`translate(${pan.x + 500}, ${pan.y + 340}) scale(${zoom})`}
          >
            {/* Links */}
            {visibleLinks.map((l, i) => {
              const a = pos[l.source];
              const b = pos[l.target];
              if (!a || !b) return null;
              const dim = highlight !== null && !(highlight === l.source || highlight === l.target);
              return (
                <line
                  key={i}
                  x1={a.x - 500}
                  y1={a.y - 340}
                  x2={b.x - 500}
                  y2={b.y - 340}
                  stroke={l.color}
                  strokeWidth={Math.max(1, l.weight)}
                  opacity={dim ? 0.12 : 0.55}
                />
              );
            })}
            {/* Nodes */}
            {visible.map((n) => {
              const p = pos[n.id];
              if (!p) return null;
              const x = p.x - 500;
              const y = p.y - 340;
              const dim = isDimmed(n.id);
              const isSel = selectedIds.includes(n.id);
              const isExp = expanded.has(n.id);
              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelect) onSelect(n.id);
                  }}
                  onDoubleClick={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(n.id)) next.delete(n.id);
                      else next.add(n.id);
                      return next;
                    });
                    setHighlight(n.id);
                  }}
                  opacity={dim ? 0.15 : 1}
                >
                  {isExp ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={(n.radius ?? 11) + 14}
                      fill="none"
                      stroke={n.color}
                      strokeDasharray="4 4"
                      opacity={0.35}
                    />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={n.radius ?? 11}
                    fill="rgba(16,26,46,0.95)"
                    stroke={n.color}
                    strokeWidth={isSel ? 2.5 : 1.5}
                  />
                  <circle cx={x} cy={y} r={4} fill={n.color} />
                  <text
                    x={x}
                    y={y + ((n.radius ?? 11) + 13)}
                    textAnchor="middle"
                    fontSize="10"
                    fill={dim ? "#4b5a75" : "#cbd5e1"}
                    style={{ pointerEvents: "none" }}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {visible.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            No nodes match the current filter.
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-4 border-t border-border px-3 py-1.5 text-[11px] text-muted">
        <span>{visible.length} nodes</span>
        <span>{visibleLinks.length} connections</span>
        <span className="ml-auto">Double-click node to expand/collapse</span>
      </div>
    </div>
  );
}
