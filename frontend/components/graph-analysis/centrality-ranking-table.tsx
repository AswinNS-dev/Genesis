"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import { entityColor } from "@backend/lib/colors";
import { cn } from "@/lib/utils";
import type { NodeMetrics } from "@backend/services/graph-analysis.service";

interface CentralityRankingTableProps {
  nodes: NodeMetrics[];
  onSelectNode?: (nodeId: string) => void;
}

export function CentralityRankingTable({ nodes, onSelectNode }: CentralityRankingTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [sortBy, setSortBy] = useState<"importance" | "degree" | "betweenness" | "closeness" | "pagerank">("importance");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(nodes.map((n) => n.type))).sort();
  }, [nodes]);

  const sortedAndFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = nodes.filter((n) => {
      if (selectedType !== "ALL" && n.type !== selectedType) return false;
      if (q && !n.name.toLowerCase().includes(q) && !n.type.toLowerCase().includes(q)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "importance") return b.importanceScore - a.importanceScore;
      if (sortBy === "degree") return b.degree - a.degree;
      if (sortBy === "betweenness") return b.betweennessCentrality - a.betweennessCentrality;
      if (sortBy === "closeness") return b.closenessCentrality - a.closenessCentrality;
      if (sortBy === "pagerank") return b.pageRank - a.pageRank;
      return 0;
    });
  }, [nodes, searchQuery, selectedType, sortBy]);

  return (
    <div className="space-y-4">
      {/* Search & Metric Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised/30 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search entity by name or type…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Entity Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          aria-label="Filter by entity type"
          className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ALL">All Entity Types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Sort Metric Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs text-muted mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
            <span>Sort Metric:</span>
          </div>

          {[
            { key: "importance", label: "Composite" },
            { key: "degree", label: "Degree" },
            { key: "betweenness", label: "Betweenness" },
            { key: "closeness", label: "Closeness" },
            { key: "pagerank", label: "PageRank" },
          ].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSortBy(m.key as "importance" | "degree" | "betweenness" | "closeness" | "pagerank")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                sortBy === m.key
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                  : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8">
          <EmptyState
            title="No entities match the criteria"
            description="Adjust search filters or selection criteria."
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedAndFiltered.map((item, index) => {
            const isExpanded = expandedId === item.id;
            const color = entityColor(item.type);

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border border-border bg-surface transition-all",
                  isExpanded ? "ring-1 ring-accent/30 shadow-lg" : "hover:border-accent/30"
                )}
              >
                {/* Main Row */}
                <div className="p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Rank, Name, Type */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised font-mono text-xs font-bold text-muted">
                        #{index + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: color }}
                          />
                          <Link
                            href={`/entities/${item.id}`}
                            className="font-semibold text-sm text-foreground hover:text-accent flex items-center gap-1"
                          >
                            {item.name}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.type}
                          </Badge>
                          <Badge variant="info" className="text-[10px]">
                            Cluster #{item.communityId}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {item.caseTitle ? `Docket: ${item.caseTitle}` : "General Intelligence Network"}
                        </div>
                      </div>
                    </div>

                    {/* Center: Centrality Metrics Badges */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      {/* Degree */}
                      <div className="rounded-lg border border-border bg-surface-raised/40 px-2.5 py-1 text-center">
                        <div className="text-[10px] text-muted">Degree (Links)</div>
                        <div className="font-mono font-bold text-foreground">
                          {item.degree}{" "}
                          <span className="text-[10px] text-muted font-normal">
                            ({item.degreeCentrality.toFixed(3)})
                          </span>
                        </div>
                      </div>

                      {/* Betweenness */}
                      <div className="rounded-lg border border-border bg-surface-raised/40 px-2.5 py-1 text-center">
                        <div className="text-[10px] text-muted">Betweenness (Bridge)</div>
                        <div className="font-mono font-bold text-foreground">
                          {item.betweennessCentrality.toFixed(4)}
                        </div>
                      </div>

                      {/* Closeness */}
                      <div className="rounded-lg border border-border bg-surface-raised/40 px-2.5 py-1 text-center">
                        <div className="text-[10px] text-muted">Closeness</div>
                        <div className="font-mono font-bold text-foreground">
                          {item.closenessCentrality.toFixed(3)}
                        </div>
                      </div>

                      {/* PageRank */}
                      <div className="rounded-lg border border-border bg-surface-raised/40 px-2.5 py-1 text-center">
                        <div className="text-[10px] text-muted">PageRank</div>
                        <div className="font-mono font-bold text-foreground">
                          {item.pageRank.toFixed(4)}
                        </div>
                      </div>

                      {/* Composite Importance Score */}
                      <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-1 text-center">
                        <div className="text-[10px] font-bold text-accent uppercase">
                          Importance
                        </div>
                        <div className="font-mono text-base font-extrabold text-accent">
                          {item.importanceScore.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                      {onSelectNode ? (
                        <button
                          type="button"
                          onClick={() => onSelectNode(item.id)}
                          className="rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
                        >
                          Focus in Graph
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide</span>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Insights</span>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Explanation Drawer */}
                {isExpanded ? (
                  <div className="border-t border-border bg-surface-raised/30 p-3.5 text-xs space-y-2">
                    <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-foreground/90">
                      <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-accent">Network Role Assessment: </span>
                        <span>{item.importanceReason}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px] text-muted">
                      <div className="rounded border border-border bg-surface p-2">
                        Direct Neighbors: <span className="font-mono font-bold text-foreground">{item.directNeighborsCount}</span>
                      </div>
                      <div className="rounded border border-border bg-surface p-2">
                        Cluster Assignment: <span className="font-mono font-bold text-foreground">#{item.communityId}</span>
                      </div>
                      <div className="rounded border border-border bg-surface p-2">
                        Betweenness Factor: <span className="font-mono font-bold text-foreground">{(item.betweennessCentrality * 100).toFixed(2)}%</span>
                      </div>
                      <div className="rounded border border-border bg-surface p-2">
                        Relative PageRank: <span className="font-mono font-bold text-foreground">{(item.pageRank * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
