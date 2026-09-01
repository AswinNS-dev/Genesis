"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2, GitBranch, Link2, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { NetworkGraph, type GraphNode, type GraphLink } from "@/components/network/network-graph";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/state";
import { entityColor, entityLabel, relationColor, relationLabel } from "@/components/entities/entity-helpers";

type Entity = { id: string; name: string; type: string };
type Rel = {
  id: string;
  type: string;
  strength: number;
  count: number;
  records: string[];
  label?: string | null;
};

export default function NetworkPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailNode, setDetailNode] = useState<Entity | null>(null);
  const [detailLinks, setDetailLinks] = useState<Rel[]>([]);
  const [analysis, setAnalysis] = useState<{
    sourceName: string;
    targetName: string;
    communication: { count: number; records: string[] };
    sharedLocations: { count: number; records: string[] };
    financial: { count: number; records: string[] };
    strength: number;
    directRelationships: Rel[];
  } | null>(null);
  const [pathA, setPathA] = useState("");
  const [pathB, setPathB] = useState("");
  const [path, setPath] = useState<{
    found: boolean;
    hops: number;
    steps: { from: string; to: string; type: string; label: string }[];
  } | null>(null);
  const [searching, setSearching] = useState(false);

  const entityIdMap = useMemo(() => {
    const map: Record<string, Entity> = {};
    for (const e of entities) map[e.id] = e;
    return map;
  }, [entities]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/intel-data?scope=network");
    const data = await res.json();
    setNodes(data.nodes ?? []);
    setLinks(data.links ?? []);
    setEntities(data.entities ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function selectNode(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    // Show detail for the node.
    const ent = entityIdMap[id];
    if (ent) {
      setDetailNode(ent);
      const res = await fetch(`/api/intel-data/entity/${id}/links`);
      const d = await res.json();
      setDetailLinks(d.links ?? []);
    }
  }

  // When exactly two selected, run relationship analysis.
  useEffect(() => {
    if (selected.length === 2 && detailNode && selected.includes(detailNode.id)) {
      const other = selected.find((s) => s !== detailNode.id);
      if (other) runAnalysis(detailNode.id, other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, detailNode]);

  async function runAnalysis(a: string, b: string) {
    try {
      const res = await fetch(`/api/intel-data/analyze?a=${a}&b=${b}`);
      const data = await res.json();
      setAnalysis(data.analysis ?? null);
    } catch {
      setAnalysis(null);
    }
  }

  async function runPathSearch() {
    const a = entities.find((e) => e.name.toLowerCase() === pathA.trim().toLowerCase());
    const b = entities.find((e) => e.name.toLowerCase() === pathB.trim().toLowerCase());
    if (!a || !b || a.id === b.id) {
      setPath({ found: false, hops: -1, steps: [] });
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/intel-data/path?a=${a.id}&b=${b.id}`);
      const data = await res.json();
      setPath(data.path);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Network Investigation"
        description="Interactive knowledge graph — select two entities for relationship analysis, or run a multi-hop search."
        icon={Share2}
        badge="Primary view"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Graph */}
        <Card className="lg:col-span-2">
          {loading ? (
            <LoadingState label="Building network graph…" />
          ) : (
            <NetworkGraph
              nodes={nodes}
              links={links}
              selectedIds={selected}
              onSelect={selectNode}
            />
          )}
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Multi-hop search"
              description="How is A connected to B?"
              action={<GitBranch className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2">
              <input
                value={pathA}
                onChange={(e) => setPathA(e.target.value)}
                placeholder="Person A"
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                value={pathB}
                onChange={(e) => setPathB(e.target.value)}
                placeholder="Person F"
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <Button className="w-full" onClick={runPathSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Find connection path
              </Button>
              {path ? (
                path.found ? (
                  <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
                    <p className="mb-2 text-xs font-medium text-foreground">
                      {path.hops} hop path found
                    </p>
                    <PathView steps={path.steps} idMap={entityIdMap} />
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    No path found between those entities within 5 hops.
                  </p>
                )
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title={detailNode ? "Selected" : "Selection"}
              description={analysis ? `${analysis.sourceName} ↔ ${analysis.targetName}` : "Click nodes on the graph"}
            />
            <CardContent>
              {!detailNode ? (
                <EmptyState title="Select a node" description="Click any node to inspect it and its connections." />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${entityColor(detailNode.type)}22` }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: entityColor(detailNode.type) }} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{detailNode.name}</span>
                    <Badge variant="outline" className="ml-auto">{entityLabel(detailNode.type)}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {detailLinks.map((l) => {
                      const label = relationLabel(l.type);
                      return (
                        <div key={l.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs">
                          <span className="truncate text-foreground">
                            {l.label ?? label} <span className="text-muted">× {l.count}</span>
                          </span>
                          <span className="shrink-0 text-muted" style={{ color: relationColor(l.type) }}>
                            {l.strength}%
                          </span>
                        </div>
                      );
                    })}
                    {detailLinks.length === 0 ? <p className="text-xs text-muted">No direct connections.</p> : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Relationship analysis */}
      {analysis ? (
        <Card>
          <CardHeader
            title={`Relationship Analysis: ${analysis.sourceName} ↔ ${analysis.targetName}`}
            description="Explainable AI — all items are investigative leads requiring verification."
            action={
              <div className="flex items-center gap-2">
                <Badge variant="warning">Strength {analysis.strength}%</Badge>
                <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            }
          />
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <AnalyzeTile label="Communication records" value={analysis.communication.count} records={analysis.communication.records} color="#34d399" />
              <AnalyzeTile label="Shared locations" value={analysis.sharedLocations.count} records={analysis.sharedLocations.records} color="#f472b6" />
              <AnalyzeTile label="Financial relationships" value={analysis.financial.count} records={analysis.financial.records} color="#f87171" />
            </div>
            <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 p-3">
              <p className="text-xs font-semibold text-accent">Why was this flagged?</p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted">
                <li>✓ {analysis.communication.count} communication records</li>
                <li>✓ {analysis.sharedLocations.count} shared location(s)</li>
                <li>✓ {analysis.financial.count} financial relationship(s)</li>
                <li>✓ Relationship relevance: {analysis.strength}%</li>
              </ul>
              <p className="mt-2 text-[11px] text-muted">
                AI-generated insights are investigative leads and require human verification.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PathView({
  steps,
  idMap,
}: {
  steps: { from: string; to: string; type: string; label: string }[];
  idMap: Record<string, Entity>;
}) {
  const nodes = [steps[0].from, ...steps.map((s) => s.to)];
  return (
    <div className="flex flex-col gap-1">
      {nodes.map((nid, i) => (
        <div key={i}>
          <span className="text-sm text-foreground">{idMap[nid]?.name ?? "unknown"}</span>
          {i < steps.length ? (
            <div className="my-0.5 flex items-center gap-1 text-[11px] text-muted">
              <span className="w-0 flex-1 border-t border-border" />
              <span className="uppercase">{steps[i].label}</span>
              <span className="w-0 flex-1 border-t border-border" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AnalyzeTile({
  label,
  value,
  records,
  color,
}: {
  label: string;
  value: number;
  records: string[];
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {records.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {records.map((r) => (
            <span key={r} className="rounded bg-border/40 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {r}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
