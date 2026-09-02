"use client";

import { useState } from "react";
import Link from "next/link";
import { Users2, ExternalLink, Activity, Network, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import { entityColor } from "@backend/lib/colors";
import type { CommunityCluster } from "@backend/services/graph-analysis.service";

interface CommunityClustersViewProps {
  communities: CommunityCluster[];
  onSelectNode?: (nodeId: string) => void;
}

export function CommunityClustersView({ communities, onSelectNode }: CommunityClustersViewProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(
    communities[0]?.id ?? null
  );

  const activeCluster = communities.find((c) => c.id === selectedClusterId) ?? communities[0];

  if (communities.length === 0) {
    return (
      <EmptyState
        title="No communities detected"
        description="No modularity clusters identified in the current graph."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Cluster List (Left Column) */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted px-1">
          Identified Network Clusters ({communities.length})
        </p>

        <div className="space-y-2">
          {communities.map((c) => {
            const isSelected = selectedClusterId === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClusterId(c.id)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? "border-accent/50 bg-accent/10 ring-1 ring-accent/30 shadow-md"
                    : "border-border bg-surface hover:border-accent/30 hover:bg-surface-raised/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-raised text-xs font-bold font-mono text-accent">
                      #{c.id}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {c.name}
                    </span>
                  </div>

                  <Badge variant="outline" className="text-[10px]">
                    {c.nodeCount} nodes
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span>Density: {(c.density * 100).toFixed(0)}%</span>
                  <span>· {c.edgeCount} relationships</span>
                  <Badge variant="outline" className="text-[9px] uppercase ml-auto">
                    {c.dominantType}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster Details (Right 2 Columns) */}
      <div className="lg:col-span-2 space-y-4">
        {activeCluster ? (
          <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono font-bold text-xs">
                    #{activeCluster.id}
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    {activeCluster.name}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Cohesive cell of {activeCluster.nodeCount} entities with {activeCluster.edgeCount} internal connections.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs">
                  Density {(activeCluster.density * 100).toFixed(1)}%
                </Badge>
                <Badge variant="outline" className="text-xs uppercase">
                  {activeCluster.dominantType} Dominant
                </Badge>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5 text-accent" />
                  <span>Total Members</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-foreground">
                  {activeCluster.nodeCount}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-sky-400" />
                  <span>Internal Edges</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-foreground">
                  {activeCluster.edgeCount}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-amber-400" />
                  <span>Cluster Density</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-foreground">
                  {(activeCluster.density * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Key Hub Members */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-accent" />
                <span>Primary Hub Members</span>
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {activeCluster.keyMembers.map((m) => {
                  const color = entityColor(m.type);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-raised/30 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: color }}
                        />
                        <div>
                          <Link
                            href={`/entities/${m.id}`}
                            className="font-semibold text-foreground hover:text-accent flex items-center gap-1"
                          >
                            {m.name}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          <span className="text-[10px] text-muted">{m.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {m.role}
                        </Badge>
                        {onSelectNode ? (
                          <button
                            type="button"
                            onClick={() => onSelectNode(m.id)}
                            className="text-[10px] text-accent hover:underline"
                          >
                            View
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Internal Relationship Types */}
            {activeCluster.internalRelationships.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Active Interaction Types in Cluster
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCluster.internalRelationships.map((t) => (
                    <Badge key={t} variant="outline" className="text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
