"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Share2,
  Users2,
  GitBranch,
  Network,
  Activity,
  Shield,
  Layers,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/state";
import { NetworkGraph, type GraphNode, type GraphLink } from "@/components/network/network-graph";
import { CentralityRankingTable } from "./centrality-ranking-table";
import { CommunityClustersView } from "./community-clusters-view";
import { PathFinderPanel } from "./path-finder-panel";
import { NetworkPatternsPanel } from "./network-patterns-panel";
import { entityColor, entityLabel, relationColor, relationLabel } from "@backend/lib/colors";
import { cn } from "@/lib/utils";
import type { FullGraphAnalysisResult } from "@backend/services/graph-analysis.service";

const GRAPH_TABS = [
  { key: "graph", label: "Knowledge Graph", icon: Share2 },
  { key: "rankings", label: "Centrality Rankings", icon: Activity },
  { key: "communities", label: "Communities & Clusters", icon: Users2 },
  { key: "paths", label: "Multi-Hop Path Finder", icon: GitBranch },
  { key: "patterns", label: "Network Patterns", icon: Shield },
] as const;

type GraphTabKey = (typeof GRAPH_TABS)[number]["key"];

interface GraphAnalysisViewProps {
  initialCaseId?: string;
}

export function GraphAnalysisView({ initialCaseId }: GraphAnalysisViewProps) {
  const [tab, setTab] = useState<GraphTabKey>("graph");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FullGraphAnalysisResult | null>(null);
  const [cases, setCases] = useState<{ id: string; caseId: string; title: string }[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedNodeIds, setFocusedNodeIds] = useState<string[]>([]);

  // Load cases and graph analysis
  async function loadData(caseFilter?: string) {
    setLoading(true);
    try {
      const caseParam = caseFilter ? `?caseId=${encodeURIComponent(caseFilter)}` : "";
      const [graphRes, casesRes] = await Promise.all([
        fetch(`/api/analysis/graph${caseParam}`).then((r) => r.json()),
        fetch("/api/intel-data?scope=cases").then((r) => r.json()),
      ]);

      setData(graphRes);
      setCases(casesRes.cases ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(selectedCaseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  // Convert NodeMetrics & EdgeData to GraphNode & GraphLink for NetworkGraph component
  const graphNodes: GraphNode[] = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.type,
      color: entityColor(n.type),
      radius: n.importanceScore >= 3.0 ? 16 : n.degree >= 3 ? 13 : 11,
    }));
  }, [data]);

  const graphLinks: GraphLink[] = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      color: e.color || relationColor(e.type),
      weight: e.weight,
      label: e.label ?? undefined,
    }));
  }, [data]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !data?.nodes) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, data]);

  const selectedNodeLinks = useMemo(() => {
    if (!selectedNodeId || !data?.edges) return [];
    return data.edges.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [selectedNodeId, data]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Case Scope Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Layers className="h-4 w-4 text-accent" />
            <span>Investigation Scope:</span>
          </div>

          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="h-9 min-w-[240px] rounded-lg border border-border bg-surface-raised px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Full Enterprise Intelligence Graph</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseId} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(selectedCaseId)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* KPI Topology Summary Cards */}
      {data?.statistics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5 text-accent" />
              <span>Total Entities</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-foreground">
              {data.statistics.totalNodes}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-sky-400" />
              <span>Relationships</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-foreground">
              {data.statistics.totalEdges}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>Network Density</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-foreground">
              {(data.statistics.density * 100).toFixed(1)}%
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-amber-400" />
              <span>Avg Degree</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-foreground">
              {data.statistics.averageDegree}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5 text-purple-400" />
              <span>Clusters</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-foreground">
              {data.statistics.communitiesCount}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-rose-400" />
              <span>Patterns Flagged</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-foreground">
              {data.patterns.length}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab Navigation Bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {GRAPH_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
                active
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30 shadow-sm"
                  : "text-muted hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.key === "patterns" && data?.patterns?.length ? (
                <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent">
                  {data.patterns.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState label="Computing network metrics, Brandes centralities & community clusters…" />
      ) : !data ? (
        <div className="text-center py-12 text-sm text-muted">
          Failed to load graph analysis.
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: KNOWLEDGE GRAPH CANVAS & INSPECTOR */}
          {tab === "graph" ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Canvas */}
              <Card className="lg:col-span-2 overflow-hidden">
                <NetworkGraph
                  nodes={graphNodes}
                  links={graphLinks}
                  selectedIds={selectedNodeId ? [selectedNodeId, ...focusedNodeIds] : focusedNodeIds}
                  onSelect={(id) => setSelectedNodeId(id)}
                />
              </Card>

              {/* Node Inspector Side Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader
                    title={selectedNode ? "Entity Inspector" : "Node Selection"}
                    description={
                      selectedNode
                        ? `Cluster #${selectedNode.communityId} · Rank #${selectedNode.rank}`
                        : "Click any node in the graph to inspect centrality and links"
                    }
                  />
                  <CardContent>
                    {!selectedNode ? (
                      <div className="text-center py-8 text-xs text-muted">
                        No node selected. Click a node in the graph above.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Title & Type */}
                        <div className="flex items-center gap-2 border-b border-border pb-3">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ background: `${entityColor(selectedNode.type)}22` }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: entityColor(selectedNode.type) }}
                            />
                          </span>
                          <div>
                            <Link
                              href={`/entities/${selectedNode.id}`}
                              className="font-bold text-sm text-foreground hover:text-accent flex items-center gap-1"
                            >
                              {selectedNode.name}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </Link>
                            <span className="text-[10px] text-muted uppercase">
                              {entityLabel(selectedNode.type)}
                            </span>
                          </div>

                          <div className="ml-auto text-right">
                            <Badge variant="default" className="font-mono text-xs">
                              Score {selectedNode.importanceScore.toFixed(2)}
                            </Badge>
                          </div>
                        </div>

                        {/* Centrality Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded border border-border bg-surface-raised/40 p-2">
                            <div className="text-[10px] text-muted">Degree Centrality</div>
                            <div className="font-mono font-bold text-foreground">
                              {selectedNode.degreeCentrality.toFixed(3)}{" "}
                              <span className="text-[10px] text-muted font-normal">
                                ({selectedNode.degree} links)
                              </span>
                            </div>
                          </div>

                          <div className="rounded border border-border bg-surface-raised/40 p-2">
                            <div className="text-[10px] text-muted">Betweenness</div>
                            <div className="font-mono font-bold text-foreground">
                              {selectedNode.betweennessCentrality.toFixed(4)}
                            </div>
                          </div>

                          <div className="rounded border border-border bg-surface-raised/40 p-2">
                            <div className="text-[10px] text-muted">Closeness</div>
                            <div className="font-mono font-bold text-foreground">
                              {selectedNode.closenessCentrality.toFixed(3)}
                            </div>
                          </div>

                          <div className="rounded border border-border bg-surface-raised/40 p-2">
                            <div className="text-[10px] text-muted">PageRank</div>
                            <div className="font-mono font-bold text-foreground">
                              {selectedNode.pageRank.toFixed(4)}
                            </div>
                          </div>
                        </div>

                        {/* Explainable Role Reason */}
                        <div className="rounded-lg border border-accent/20 bg-accent/5 p-2.5 text-[11px] text-foreground/90">
                          <span className="font-semibold text-accent">Assessment: </span>
                          <span>{selectedNode.importanceReason}</span>
                        </div>

                        {/* Connected Relationships */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase text-muted">
                            Direct Relationships ({selectedNodeLinks.length})
                          </p>

                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {selectedNodeLinks.map((l) => {
                              const otherName =
                                l.source === selectedNode.id ? l.targetName : l.sourceName;

                              return (
                                <div
                                  key={l.id}
                                  className="flex items-center justify-between rounded border border-border bg-surface px-2 py-1 text-[11px]"
                                >
                                  <span className="truncate text-foreground">
                                    <span
                                      className="font-medium"
                                      style={{ color: relationColor(l.type) }}
                                    >
                                      {l.label ?? relationLabel(l.type)}:
                                    </span>{" "}
                                    {otherName}
                                  </span>
                                  <span className="shrink-0 font-mono text-[10px] text-muted">
                                    {l.strength}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* TAB 2: CENTRALITY RANKINGS TABLE */}
          {tab === "rankings" ? (
            <CentralityRankingTable
              nodes={data.nodes}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                setTab("graph");
              }}
            />
          ) : null}

          {/* TAB 3: COMMUNITIES & CLUSTERS */}
          {tab === "communities" ? (
            <CommunityClustersView
              communities={data.communities}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                setTab("graph");
              }}
            />
          ) : null}

          {/* TAB 4: MULTI-HOP PATH FINDER */}
          {tab === "paths" ? (
            <PathFinderPanel
              nodes={data.nodes}
              onFocusPath={(pathIds) => {
                setFocusedNodeIds(pathIds);
                if (pathIds[0]) setSelectedNodeId(pathIds[0]);
              }}
            />
          ) : null}

          {/* TAB 5: NETWORK PATTERNS */}
          {tab === "patterns" ? (
            <NetworkPatternsPanel
              patterns={data.patterns}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                setTab("graph");
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
