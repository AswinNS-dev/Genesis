"use client";

import Link from "next/link";
import {
  ShieldAlert,
  GitCommit,
  Network,
  Users2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import type { NetworkPattern } from "@backend/services/graph-analysis.service";

interface NetworkPatternsPanelProps {
  patterns: NetworkPattern[];
  onSelectNode?: (nodeId: string) => void;
}

export function NetworkPatternsPanel({ patterns, onSelectNode }: NetworkPatternsPanelProps) {
  if (patterns.length === 0) {
    return (
      <EmptyState
        title="No specialized structural anomalies detected"
        description="The network exhibits uniform distributed topology."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {patterns.map((p) => {
          let Icon = Network;
          if (p.type === "HUB_ENTITY") Icon = GitCommit;
          if (p.type === "BRIDGE_NODE") Icon = Network;
          if (p.type === "DENSE_CELL") Icon = Users2;
          if (p.type === "CROSS_CASE_BRIDGE") Icon = ShieldAlert;

          return (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">
                      {p.title}
                    </h4>
                  </div>

                  <Badge
                    variant={
                      p.severity === "CRITICAL"
                        ? "danger"
                        : p.severity === "HIGH"
                        ? "warning"
                        : "info"
                    }
                    className="text-[10px]"
                  >
                    {p.severity}
                  </Badge>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="border-t border-border pt-2.5 space-y-2 text-xs">
                <div className="text-[11px] text-muted">
                  <span className="font-semibold text-foreground">Metrics: </span>
                  <span>{p.metricDetail}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted">Involved:</span>
                  {p.involvedEntityIds.map((id, idx) => (
                    <div key={id} className="flex items-center gap-1">
                      <Link
                        href={`/entities/${id}`}
                        className="rounded bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-accent hover:underline flex items-center gap-1"
                      >
                        {p.involvedEntityNames[idx] ?? id}
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </Link>
                      {onSelectNode ? (
                        <button
                          type="button"
                          onClick={() => onSelectNode(id)}
                          className="text-[10px] text-muted hover:text-foreground"
                        >
                          [focus]
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
