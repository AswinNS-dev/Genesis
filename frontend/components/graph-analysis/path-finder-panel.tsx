"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitBranch,
  Link2,
  Loader2,
  ArrowRight,
  Users,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { entityColor, relationColor } from "@backend/lib/colors";
import type { NodeMetrics } from "@backend/services/graph-analysis.service";

interface PathFinderPanelProps {
  nodes: NodeMetrics[];
  onFocusPath?: (nodeIds: string[]) => void;
}

export function PathFinderPanel({ nodes, onFocusPath }: PathFinderPanelProps) {
  const [sourceId, setSourceId] = useState(nodes[0]?.id ?? "");
  const [targetId, setTargetId] = useState(nodes[1]?.id ?? "");
  const [maxDepth, setMaxDepth] = useState(4);
  const [loading, setLoading] = useState(false);
  const [pathResult, setPathResult] = useState<{
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
    found: boolean;
    hopCount: number;
    path: {
      entityId: string;
      name: string;
      type: string;
      relationshipToNext?: {
        type: string;
        label: string | null;
        strength: number;
        count: number;
      };
    }[];
    commonNeighbors: { id: string; name: string; type: string }[];
    jaccardSimilarity: number;
    explanation: string;
  } | null>(null);

  async function handleFindPath() {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/analysis/graph/path?source=${encodeURIComponent(sourceId)}&target=${encodeURIComponent(targetId)}&maxDepth=${maxDepth}`
      );
      const data = await res.json();
      setPathResult(data);

      if (data.found && onFocusPath) {
        onFocusPath(data.path.map((p: { entityId: string }) => p.entityId));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Path Selector Card */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <GitBranch className="h-4 w-4 text-accent" />
          <h4 className="text-sm font-bold text-foreground">
            Multi-Hop Connection & Shortest Path Finder
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Source Entity */}
          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">
              Source Entity A
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.type})
                </option>
              ))}
            </select>
          </div>

          {/* Target Entity */}
          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">
              Target Entity B
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.type})
                </option>
              ))}
            </select>
          </div>

          {/* Max Depth & Submit */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted block mb-1">
                Max Hops
              </label>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value={2}>2 Hops</option>
                <option value={3}>3 Hops</option>
                <option value={4}>4 Hops</option>
                <option value={5}>5 Hops</option>
              </select>
            </div>

            <Button
              onClick={handleFindPath}
              disabled={loading || !sourceId || !targetId || sourceId === targetId}
              className="h-9"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Link2 className="h-4 w-4 mr-1.5" />
              )}
              {loading ? "Tracing…" : "Trace Path"}
            </Button>
          </div>
        </div>
      </div>

      {/* Path Results */}
      {pathResult ? (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Badge variant={pathResult.found ? "success" : "danger"}>
                {pathResult.found ? `${pathResult.hopCount} Hop Connection` : "No Connection"}
              </Badge>
              <span className="text-xs font-semibold text-foreground">
                {pathResult.sourceName} ↔ {pathResult.targetName}
              </span>
            </div>

            {pathResult.commonNeighbors.length > 0 ? (
              <Badge variant="outline" className="text-xs">
                {pathResult.commonNeighbors.length} Common Intermediaries (Jaccard: {pathResult.jaccardSimilarity})
              </Badge>
            ) : null}
          </div>

          {/* Explainable Narrative Alert */}
          <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-foreground/90">
            <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-accent">Analysis Finding: </span>
              <span>{pathResult.explanation}</span>
            </div>
          </div>

          {/* Step-by-Step Shortest Path Visualization */}
          {pathResult.found ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Geodesic Chain ({pathResult.path.length} Entities)
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {pathResult.path.map((step, idx) => {
                  const color = entityColor(step.type);
                  const isLast = idx === pathResult.path.length - 1;
                  const rel = step.relationshipToNext;

                  return (
                    <div key={step.entityId} className="flex items-center gap-2">
                      {/* Node Card */}
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised/40 p-2.5 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: color }}
                        />
                        <div>
                          <Link
                            href={`/entities/${step.entityId}`}
                            className="font-semibold text-foreground hover:text-accent flex items-center gap-1"
                          >
                            {step.name}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          <span className="text-[10px] text-muted uppercase">{step.type}</span>
                        </div>
                      </div>

                      {/* Relationship Arrow Connector */}
                      {!isLast && rel ? (
                        <div className="flex flex-col items-center px-1 text-[10px] text-muted">
                          <span
                            className="font-semibold uppercase tracking-wider"
                            style={{ color: relationColor(rel.type) }}
                          >
                            {rel.label ?? rel.type}
                          </span>
                          <div className="flex items-center gap-0.5 text-muted">
                            <span className="h-px w-6 bg-border" />
                            <ArrowRight className="h-3 w-3 text-accent" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Common Neighbors Intermediaries */}
          {pathResult.commonNeighbors.length > 0 ? (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-accent" />
                <span>Shared Common Neighbors / Mutual Intermediaries</span>
              </p>

              <div className="flex flex-wrap gap-2">
                {pathResult.commonNeighbors.map((cnItem) => (
                  <div
                    key={cnItem.id}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised/40 px-2.5 py-1 text-xs"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: entityColor(cnItem.type) }}
                    />
                    <Link
                      href={`/entities/${cnItem.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {cnItem.name}
                    </Link>
                    <span className="text-[10px] text-muted">({cnItem.type})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
