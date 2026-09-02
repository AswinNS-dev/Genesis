"use client";

import Link from "next/link";
import {
  UserCheck,
  Share2,
  GitBranch,
  Target,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { entityColor, entityLabel, relationColor, relationLabel } from "@backend/lib/colors";
import type { NodeMetrics, EdgeData } from "@backend/services/graph-analysis.service";

interface EntityIntelligencePanelProps {
  node: NodeMetrics | null;
  edges: EdgeData[];
  onFocusNetwork: (nodeId: string, hops: number) => void;
  onFindConnection: (nodeName: string) => void;
  onSelectRelationship: (edge: EdgeData) => void;
}

export function EntityIntelligencePanel({
  node,
  edges,
  onFocusNetwork,
  onFindConnection,
  onSelectRelationship,
}: EntityIntelligencePanelProps) {
  if (!node) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-2 shadow-card">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised border border-border text-muted">
          <Share2 className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Entity Intelligence Panel</h4>
        <p className="text-xs text-muted max-w-xs mx-auto">
          Click any node on the graph to inspect centrality metrics, direct associations, and investigative connections.
        </p>
      </div>
    );
  }

  // Find all direct edges involving this node
  const directEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4 shadow-card animate-fade-in">
      {/* Node Profile Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg border font-bold text-xs"
            style={{
              borderColor: entityColor(node.type),
              background: `${entityColor(node.type)}15`,
              color: entityColor(node.type),
            }}
          >
            {node.type.substring(0, 3)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">{node.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px] uppercase">
                {entityLabel(node.type)}
              </Badge>
              {node.caseTitle && (
                <span className="text-[11px] text-muted truncate max-w-[140px]" title={node.caseTitle}>
                  • {node.caseTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-muted block">Importance</span>
          <span className="font-mono text-sm font-bold text-accent">
            {node.importanceScore.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* Centrality Metrics (Neutral Terminology) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
          <Activity className="h-3 w-3" /> Network Metrics
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-border bg-surface-raised/40 p-2 space-y-0.5">
            <span className="text-[10px] text-muted block">Degree Connections</span>
            <span className="font-semibold text-foreground">{node.directNeighborsCount} Direct links</span>
          </div>

          <div className="rounded border border-border bg-surface-raised/40 p-2 space-y-0.5">
            <span className="text-[10px] text-muted block">Intermediary Role</span>
            <span className="font-semibold text-foreground">
              {node.betweennessCentrality > 0.1 ? "Key Bridge Node" : "Local Participant"}
            </span>
          </div>

          <div className="rounded border border-border bg-surface-raised/40 p-2 space-y-0.5">
            <span className="text-[10px] text-muted block">Network Influence</span>
            <span className="font-semibold text-foreground">{(node.pageRank * 100).toFixed(1)}% PageRank</span>
          </div>

          <div className="rounded border border-border bg-surface-raised/40 p-2 space-y-0.5">
            <span className="text-[10px] text-muted block">Community Cluster</span>
            <span className="font-semibold text-foreground">Cluster #{node.communityId}</span>
          </div>
        </div>

        {node.importanceReason && (
          <p className="text-[11px] text-muted bg-surface-raised/30 rounded border border-border p-2 leading-relaxed">
            💡 {node.importanceReason}
          </p>
        )}
      </div>

      {/* Focus & Action Controls */}
      <div className="space-y-2 border-t border-border pt-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
          Investigative Actions
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onFocusNetwork(node.id, 1)}
            className="text-xs h-7 px-2"
          >
            <Target className="h-3 w-3 mr-1" />
            Focus 1 Hop
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onFocusNetwork(node.id, 2)}
            className="text-xs h-7 px-2"
          >
            <Layers className="h-3 w-3 mr-1" />
            Focus 2 Hops
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onFindConnection(node.name)}
            className="text-xs h-7 px-2"
          >
            <GitBranch className="h-3 w-3 mr-1" />
            Find Path
          </Button>
        </div>
      </div>

      {/* Direct Relationships List */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Direct Connections ({directEdges.length})
          </span>
          <span className="text-[10px] text-muted">Click to inspect</span>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {directEdges.map((e) => {
            const isSource = e.source === node.id;
            const otherName = isSource ? e.targetName : e.sourceName;
            const otherId = isSource ? e.target : e.source;

            return (
              <button
                key={e.id}
                onClick={() => onSelectRelationship(e)}
                className="w-full flex items-center justify-between rounded border border-border/70 bg-surface-raised/20 hover:bg-surface-raised px-2.5 py-1.5 text-xs text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: relationColor(e.type) }}
                  />
                  <span className="truncate text-foreground font-medium">{otherName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted">
                    {e.label || relationLabel(e.type)}
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    {e.strength}%
                  </Badge>
                </div>
              </button>
            );
          })}

          {directEdges.length === 0 && (
            <p className="text-xs text-muted py-2 text-center">No direct links in current filtered view.</p>
          )}
        </div>
      </div>

      {/* Full Dossier Link */}
      <div className="border-t border-border pt-2 text-center">
        <Link
          href={`/entities/${node.id}`}
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-semibold"
        >
          <span>Open Full Intelligence Dossier</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
