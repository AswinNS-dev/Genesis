"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Share2,
  GitBranch,
  Link2,
  Loader2,
  Target,
  ShieldAlert,
  Users,
  Layers,
  Sparkles,
  RotateCcw,
  Activity,
  FileSearch,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";
import { NetworkGraph, type GraphNode, type GraphLink } from "@/components/network/network-graph";
import { NetworkFilterBar, type NetworkFilters } from "@/components/network/network-filter-bar";
import { EntityIntelligencePanel } from "@/components/network/entity-intelligence-panel";
import { RelationshipInspector } from "@/components/network/relationship-inspector";
import { entityColor, relationColor } from "@backend/lib/colors";
import type {
  FullGraphAnalysisResult,
  NodeMetrics,
  EdgeData,
  MultiHopPathResult,
} from "@backend/services/graph-analysis.service";

export default function CriminalNetworkPage() {
  const [data, setData] = useState<FullGraphAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<NetworkFilters>({});
  
  // Selection states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeData | null>(null);
  const [focusMode, setFocusMode] = useState<{ nodeId: string; nodeName: string; hops: number } | null>(null);

  // Path Finder states
  const [pathA, setPathA] = useState("");
  const [pathB, setPathB] = useState("");
  const [maxHops, setMaxHops] = useState(4);
  const [searchingPath, setSearchingPath] = useState(false);
  const [pathResult, setPathResult] = useState<MultiHopPathResult | null>(null);

  // Active right-side inspector tab
  const [inspectorTab, setInspectorTab] = useState<"entity" | "path" | "edge">("entity");

  // Load graph data from API
  async function loadGraph(filters: NetworkFilters = {}, focus?: { nodeId: string; hops: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.searchQuery) params.set("searchQuery", filters.searchQuery);
      if (filters.crimeType && filters.crimeType !== "ALL") params.set("crimeType", filters.crimeType);
      if (filters.district && filters.district !== "ALL") params.set("district", filters.district);
      if (filters.entityType && filters.entityType !== "ALL") params.set("entityType", filters.entityType);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      if (focus) {
        params.set("focusEntityId", focus.nodeId);
        params.set("focusHops", String(focus.hops));
      }

      const res = await fetch(`/api/analysis/graph?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Auto-select first node if none selected
        if (!selectedNodeId && json.nodes && json.nodes.length > 0) {
          setSelectedNodeId(json.nodes[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load criminal network graph:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format nodes and links for NetworkGraph component
  const graphNodes: GraphNode[] = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.type,
      color: entityColor(n.type),
      radius: Math.min(18, Math.max(10, 10 + n.degree * 1.5)),
      caseTitle: n.caseTitle,
      riskScore: n.riskScore,
    }));
  }, [data]);

  const graphLinks: GraphLink[] = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      color: e.color || relationColor(e.type),
      weight: e.weight || 1,
      label: e.label,
      strength: e.strength,
      count: e.count,
      records: e.records,
    }));
  }, [data]);

  // Selected node metrics
  const selectedNodeMetrics = useMemo(() => {
    if (!selectedNodeId || !data?.nodes) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, data]);

  // Handle filter application
  const handleApplyFilters = (filters: NetworkFilters) => {
    setActiveFilters(filters);
    setFocusMode(null);
    setSelectedEdge(null);
    setPathResult(null);
    loadGraph(filters);
  };

  const handleResetFilters = () => {
    setActiveFilters({});
    setFocusMode(null);
    setSelectedEdge(null);
    setPathResult(null);
    loadGraph({});
  };

  // Handle Node click
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdge(null);
    setInspectorTab("entity");
  };

  // Handle Edge click
  const handleSelectEdge = (link: GraphLink) => {
    if (!data?.edges) return;
    const edge = data.edges.find(
      (e) => (e.source === link.source && e.target === link.target) ||
             (e.source === link.target && e.target === link.source)
    );
    if (edge) {
      setSelectedEdge(edge);
      setInspectorTab("edge");
    }
  };

  // Focus Mode
  const handleFocusNetwork = (nodeId: string, hops: number) => {
    const node = data?.nodes.find((n) => n.id === nodeId);
    setFocusMode({
      nodeId,
      nodeName: node?.name || nodeId,
      hops,
    });
    setSelectedNodeId(nodeId);
    setSelectedEdge(null);
    loadGraph(activeFilters, { nodeId, hops });
  };

  const handleClearFocus = () => {
    setFocusMode(null);
    loadGraph(activeFilters);
  };

  // Pre-fill path finder from entity panel
  const handleFindConnectionFromNode = (nodeName: string) => {
    if (!pathA) {
      setPathA(nodeName);
    } else {
      setPathB(nodeName);
    }
    setInspectorTab("path");
  };

  // Run investigative shortest-path search
  const handleRunPathSearch = async () => {
    if (!pathA.trim() || !pathB.trim() || !data?.nodes) return;
    const sourceNode = data.nodes.find(
      (n) => n.name.toLowerCase() === pathA.trim().toLowerCase() || n.id === pathA.trim()
    );
    const targetNode = data.nodes.find(
      (n) => n.name.toLowerCase() === pathB.trim().toLowerCase() || n.id === pathB.trim()
    );

    if (!sourceNode || !targetNode) {
      setPathResult({
        sourceId: pathA,
        targetId: pathB,
        sourceName: pathA,
        targetName: pathB,
        found: false,
        hopCount: 0,
        path: [],
        commonNeighbors: [],
        jaccardSimilarity: 0,
        explanation: `One or both entities ("${pathA}", "${pathB}") could not be found in the current filtered network.`,
      });
      return;
    }

    setSearchingPath(true);
    try {
      const res = await fetch(
        `/api/analysis/graph/path?sourceId=${sourceNode.id}&targetId=${targetNode.id}&maxDepth=${maxHops}`
      );
      if (res.ok) {
        const json = await res.json();
        setPathResult(json);
      }
    } catch (err) {
      console.error("Path search failed:", err);
    } finally {
      setSearchingPath(false);
    }
  };

  // Compute node IDs to highlight along found path
  const pathNodeIds = useMemo(() => {
    if (!pathResult || !pathResult.found || !pathResult.path) return [];
    return pathResult.path.map((p) => p.entityId);
  }, [pathResult]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Criminal Network Analysis"
        description="Investigative decision-support knowledge graph with multi-parameter filtering, progressive inspection, and multi-hop connection tracing."
        icon={Share2}
        badge="Intelligence Graph"
      />

      {/* Multi-Parameter Structured Filter Bar */}
      <NetworkFilterBar
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        loading={loading}
      />

      {/* Network Overview Summary KPI Cards */}
      {data?.statistics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-surface p-3 shadow-card space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted">Network Entities</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono text-foreground">{data.statistics.totalNodes}</span>
              <Users className="h-4 w-4 text-accent/70" />
            </div>
            <span className="text-[10px] text-muted">{data.statistics.isolatedNodesCount} Isolated</span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 shadow-card space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted">Evidence Connections</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono text-foreground">{data.statistics.totalEdges}</span>
              <Link2 className="h-4 w-4 text-emerald-400/70" />
            </div>
            <span className="text-[10px] text-muted">Avg {data.statistics.averageDegree} Links/node</span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 shadow-card space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted">Network Clusters</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono text-foreground">{data.statistics.communitiesCount}</span>
              <Layers className="h-4 w-4 text-purple-400/70" />
            </div>
            <span className="text-[10px] text-muted">Detected Groups</span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 shadow-card space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted">Graph Density</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono text-foreground">
                {(data.statistics.density * 100).toFixed(1)}%
              </span>
              <Activity className="h-4 w-4 text-amber-400/70" />
            </div>
            <span className="text-[10px] text-muted">Connectivity ratio</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl border border-border bg-surface p-3 shadow-card space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted">Network Patterns</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono text-foreground">{data.patterns.length}</span>
              <Sparkles className="h-4 w-4 text-sky-400/70" />
            </div>
            <span className="text-[10px] text-muted">Key structural signals</span>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column (2 Cols): Interactive Network Graph */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden border-border bg-surface">
            {loading ? (
              <div className="h-[600px] flex items-center justify-center">
                <LoadingState label="Computing criminal network topology & centrality metrics..." />
              </div>
            ) : (
              <NetworkGraph
                nodes={graphNodes}
                links={graphLinks}
                onSelect={handleSelectNode}
                onSelectEdge={handleSelectEdge}
                selectedIds={selectedNodeId ? [selectedNodeId] : []}
                pathNodeIds={pathNodeIds}
                focusMode={focusMode}
                onClearFocus={handleClearFocus}
              />
            )}
          </Card>

          {/* Communities & Key Player Quick List */}
          {data && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Key Influencers */}
              <Card>
                <CardHeader
                  title="Key Network Intermediaries"
                  description="Entities with highest centrality in current filtered view"
                  action={<Badge variant="outline" className="text-[10px]">Top Influencers</Badge>}
                />
                <CardContent className="space-y-1.5 pt-0">
                  {data.topInfluencers.slice(0, 4).map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleSelectNode(node.id)}
                      className="w-full flex items-center justify-between rounded border border-border bg-surface-raised/30 hover:bg-surface-raised p-2 text-xs text-left transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: entityColor(node.type) }}
                        />
                        <span className="font-semibold text-foreground truncate">{node.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-accent shrink-0">
                        {node.directNeighborsCount} links
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Detected Communities */}
              <Card>
                <CardHeader
                  title="Network Communities"
                  description="Structural clusters based on shared associations"
                  action={<Badge variant="outline" className="text-[10px]">{data.communities.length} Clusters</Badge>}
                />
                <CardContent className="space-y-1.5 pt-0">
                  {data.communities.slice(0, 4).map((comm) => (
                    <div
                      key={comm.id}
                      className="flex items-center justify-between rounded border border-border bg-surface-raised/30 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                          #{comm.id}
                        </span>
                        <span className="font-medium text-foreground">{comm.name}</span>
                      </div>
                      <span className="text-muted text-[11px]">{comm.nodeCount} Entities</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Tabbed Intelligence Inspector */}
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-card">
            <button
              onClick={() => setInspectorTab("entity")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                inspectorTab === "entity"
                  ? "bg-accent text-black"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Entity Details
            </button>
            <button
              onClick={() => setInspectorTab("path")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                inspectorTab === "path"
                  ? "bg-accent text-black"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Path Finder
            </button>
            <button
              onClick={() => setInspectorTab("edge")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                inspectorTab === "edge"
                  ? "bg-accent text-black"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Relationship
            </button>
          </div>

          {/* TAB 1: Entity Intelligence Panel */}
          {inspectorTab === "entity" && (
            <EntityIntelligencePanel
              node={selectedNodeMetrics}
              edges={data?.edges || []}
              onFocusNetwork={handleFocusNetwork}
              onFindConnection={handleFindConnectionFromNode}
              onSelectRelationship={(edge) => {
                setSelectedEdge(edge);
                setInspectorTab("edge");
              }}
            />
          )}

          {/* TAB 2: Investigative Path Finder */}
          {inspectorTab === "path" && (
            <Card className="shadow-card">
              <CardHeader
                title="Investigative Path Finder"
                description="Find shortest evidence-backed connection between two entities"
                action={<GitBranch className="h-4 w-4 text-accent" />}
              />
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted block mb-1">
                      Source Entity (From)
                    </label>
                    <input
                      type="text"
                      value={pathA}
                      onChange={(e) => setPathA(e.target.value)}
                      placeholder="e.g. Raj Kumar"
                      className="h-8 w-full rounded-lg border border-border bg-surface-raised px-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted block mb-1">
                      Target Entity (To)
                    </label>
                    <input
                      type="text"
                      value={pathB}
                      onChange={(e) => setPathB(e.target.value)}
                      placeholder="e.g. Suresh Kumar"
                      className="h-8 w-full rounded-lg border border-border bg-surface-raised px-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted block mb-1">
                      Maximum Search Hops
                    </label>
                    <select
                      value={maxHops}
                      onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                      className="h-8 w-full rounded-lg border border-border bg-surface-raised px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value={1}>1 Hop (Direct only)</option>
                      <option value={2}>2 Hops (1 Intermediary)</option>
                      <option value={3}>3 Hops (2 Intermediaries)</option>
                      <option value={4}>4 Hops (Extended network)</option>
                    </select>
                  </div>
                </div>

                <Button
                  className="w-full h-8 text-xs"
                  onClick={handleRunPathSearch}
                  disabled={searchingPath || !pathA.trim() || !pathB.trim()}
                >
                  {searchingPath ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <FileSearch className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Find Connection Path
                </Button>

                {/* Path Results */}
                {pathResult && (
                  <div className="rounded-lg border border-border bg-surface-raised/40 p-3 space-y-2.5 animate-fade-in">
                    {pathResult.found ? (
                      <>
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> {pathResult.hopCount} Hop Path Found
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            Jaccard: {(pathResult.jaccardSimilarity * 100).toFixed(0)}%
                          </Badge>
                        </div>

                        {/* Step By Step Traversal */}
                        <div className="space-y-1.5 text-xs">
                          {pathResult.path.map((step, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-border text-[10px] font-bold text-foreground">
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-foreground">{step.name}</span>
                                <Badge variant="outline" className="text-[9px] ml-auto">
                                  {step.type}
                                </Badge>
                              </div>
                              {step.relationshipToNext && (
                                <div className="ml-2.5 pl-3 border-l border-dashed border-border py-1 text-[11px] text-muted">
                                  ↓ {step.relationshipToNext.label || step.relationshipToNext.type}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <p className="text-[11px] text-muted bg-surface/60 rounded p-2 leading-relaxed">
                          {pathResult.explanation}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted text-center py-2">
                        {pathResult.explanation || "No connecting path found within the selected hop limit."}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Relationship Inspector */}
          {inspectorTab === "edge" && (
            <RelationshipInspector
              relationship={selectedEdge}
              onClose={() => setInspectorTab("entity")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
