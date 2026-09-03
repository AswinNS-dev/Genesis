"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Sparkles, Eye, Loader2, FileText, ListChecks,
  Network, Users2, Activity, Shield, GitBranch,
  TrendingUp, AlertTriangle, RefreshCw, Share2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";
import type { FullGraphAnalysisResult } from "@backend/services/graph-analysis.service";

type Pattern = {
  id: string; type: string; title: string;
  summary: string; severity: string; relevance: number; createdAt: string;
};
type Case = { id: string; caseId: string; title: string };

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "default"> = {
  HIGH: "danger", MEDIUM: "warning", LOW: "info", CRITICAL: "danger",
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#f43f5e", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e",
};

const ENTITY_COLORS: Record<string, string> = {
  PERSON: "#6366f1", ORGANIZATION: "#8b5cf6", PHONE: "#22d3ee",
  VEHICLE: "#f59e0b", LOCATION: "#f43f5e", ACCOUNT: "#10b981",
};

// Minimal inline bar chart — no external deps
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-muted">{d.label}</span>
          <div className="flex-1 h-4 rounded bg-surface-raised/60 overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
          <span className="w-8 text-right font-mono font-bold text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// Donut-style ring chart using SVG
function RingChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const r = 36, cx = 44, cy = 44, stroke = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={88} height={88} className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        {segments.map((seg) => {
          const dash = (seg.value / total) * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={seg.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy + 5} textAnchor="middle" className="fill-foreground text-xs font-bold" fontSize={13}>
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-muted">{seg.label}</span>
            <span className="ml-auto font-mono font-semibold text-foreground pl-2">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat tile
function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export default function AiInsightsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [graphData, setGraphData] = useState<FullGraphAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [summary, setSummary] = useState<{
    overview: string; keyEntities: string[]; majorRelationships: string[];
    importantPatterns: string[]; timelineHighlights: string[];
    investigationAreas: string[]; caveat: string;
  } | null>(null);
  const [leads, setLeads] = useState<{ title: string; detail: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  // Load patterns + cases
  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        fetch("/api/intel-data?scope=patterns").then((r) => r.json()),
        fetch("/api/intel-data?scope=cases").then((r) => r.json()),
      ]);
      setPatterns(p.patterns ?? []);
      setCases(c.cases ?? []);
      setSelectedCaseId(c.cases?.[0]?.id ?? "");
      setLoading(false);
    })();
  }, []);

  // Load graph intelligence
  async function loadGraphInsights(caseId?: string) {
    setGraphLoading(true);
    try {
      const param = caseId ? `?caseId=${encodeURIComponent(caseId)}` : "";
      const res = await fetch(`/api/analysis/graph${param}`);
      const data = await res.json();
      setGraphData(data);
    } finally {
      setGraphLoading(false);
    }
  }

  useEffect(() => { loadGraphInsights(); }, []);

  async function generateSummary() {
    if (!selectedCaseId) return;
    setGenerating(true);
    setSummary(null);
    setLeads([]);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/analyze`, { method: "POST" });
      const data = await res.json();
      setSummary(data.summary);
      setLeads(data.leads ?? []);
      // Reload graph for selected case
      loadGraphInsights(selectedCaseId);
    } catch {
      setSummary(null);
    } finally {
      setGenerating(false);
    }
  }

  // Derived chart data
  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    patterns.forEach((p) => { counts[p.severity] = (counts[p.severity] ?? 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({
      label, value, color: SEVERITY_COLOR[label] ?? "#6366f1",
    }));
  }, [patterns]);

  const patternTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    patterns.forEach((p) => { counts[p.type] = (counts[p.type] ?? 0) + 1; });
    return Object.entries(counts).map(([label, value], i) => ({
      label, value,
      color: ["#6366f1", "#8b5cf6", "#22d3ee", "#f59e0b", "#f43f5e"][i % 5],
    }));
  }, [patterns]);

  const entityTypeData = useMemo(() => {
    if (!graphData?.nodes) return [];
    const counts: Record<string, number> = {};
    graphData.nodes.forEach((n) => { counts[n.type] = (counts[n.type] ?? 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({
      label, value, color: ENTITY_COLORS[label] ?? "#6366f1",
    }));
  }, [graphData]);

  const topInfluencers = graphData?.topInfluencers?.slice(0, 5) ?? [];
  const topBridges = graphData?.topBridges?.slice(0, 5) ?? [];
  const networkPatterns = graphData?.patterns ?? [];
  const stats = graphData?.statistics;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AI Insights & Explainability"
        description="Graph intelligence, network patterns, entity analytics, and explainable investigation summaries."
        icon={Sparkles}
        badge="Explained AI"
      />

      {/* ── SECTION 1: Network Topology KPIs ── */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile icon={Users2}    label="Total Entities"    value={stats.totalNodes}                        color="#6366f1" />
          <StatTile icon={Share2}    label="Relationships"     value={stats.totalEdges}                        color="#38bdf8" />
          <StatTile icon={Activity}  label="Network Density"   value={`${(stats.density * 100).toFixed(1)}%`}  color="#34d399" />
          <StatTile icon={Network}   label="Avg Degree"        value={stats.averageDegree}                     color="#fbbf24" />
          <StatTile icon={Users2}    label="Clusters"          value={stats.communitiesCount}                  color="#a78bfa" />
          <StatTile icon={Shield}    label="Patterns Flagged"  value={networkPatterns.length + patterns.length} color="#f43f5e" />
        </div>
      ) : graphLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : null}

      {/* ── SECTION 2: Visual Charts Row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Severity Distribution */}
        <Card>
          <CardHeader
            title="Pattern severity distribution"
            description="Breakdown of flagged patterns by severity level"
            action={<AlertTriangle className="h-4 w-4 text-muted" />}
          />
          <CardContent>
            {loading ? <LoadingState label="Loading…" /> : severityData.length === 0 ? (
              <EmptyState title="No patterns yet" description="Run a case analysis to generate patterns." />
            ) : (
              <div className="space-y-5">
                <RingChart segments={severityData} />
                <BarChart data={severityData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity Type Breakdown */}
        <Card>
          <CardHeader
            title="Entity type breakdown"
            description="Distribution of entity types in the intelligence graph"
            action={<Users2 className="h-4 w-4 text-muted" />}
          />
          <CardContent>
            {graphLoading ? <LoadingState label="Loading graph…" /> : entityTypeData.length === 0 ? (
              <EmptyState title="No graph data" description="Graph analysis not yet available." />
            ) : (
              <div className="space-y-5">
                <RingChart segments={entityTypeData} />
                <BarChart data={entityTypeData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pattern Type Breakdown */}
        <Card>
          <CardHeader
            title="Pattern type breakdown"
            description="Categories of detected intelligence patterns"
            action={<TrendingUp className="h-4 w-4 text-muted" />}
          />
          <CardContent>
            {loading ? <LoadingState label="Loading…" /> : patternTypeData.length === 0 ? (
              <EmptyState title="No pattern types" description="Run a case analysis to populate." />
            ) : (
              <BarChart data={patternTypeData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 3: Top Influencers + Bridge Nodes ── */}
      {!graphLoading && (topInfluencers.length > 0 || topBridges.length > 0) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top Influencers */}
          <Card>
            <CardHeader
              title="Top network influencers"
              description="Highest degree centrality — most connected entities"
              action={<Network className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2">
              {topInfluencers.map((n, i) => (
                <div key={n.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/30 px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{n.name}</p>
                    <p className="text-[10px] text-muted uppercase">{n.type}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-mono text-xs font-bold text-accent">{n.degree} links</div>
                    <div className="text-[10px] text-muted">score {n.importanceScore.toFixed(2)}</div>
                  </div>
                  {/* Inline degree bar */}
                  <div className="w-16 h-1.5 rounded bg-surface-raised overflow-hidden shrink-0">
                    <div
                      className="h-full rounded bg-accent"
                      style={{ width: `${Math.min(100, (n.degreeCentrality) * 100 * 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Bridge Nodes */}
          <Card>
            <CardHeader
              title="Key bridge nodes"
              description="Highest betweenness centrality — critical intermediaries"
              action={<GitBranch className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2">
              {topBridges.map((n, i) => (
                <div key={n.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/30 px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10 font-mono text-xs font-bold text-warning">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{n.name}</p>
                    <p className="text-[10px] text-muted uppercase">{n.type} · Cluster #{n.communityId}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-mono text-xs font-bold text-warning">{n.betweennessCentrality.toFixed(4)}</div>
                    <div className="text-[10px] text-muted">betweenness</div>
                  </div>
                  <div className="w-16 h-1.5 rounded bg-surface-raised overflow-hidden shrink-0">
                    <div
                      className="h-full rounded bg-warning"
                      style={{ width: `${Math.min(100, n.betweennessCentrality * 500)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── SECTION 4: Network Structural Patterns ── */}
      {!graphLoading && networkPatterns.length > 0 ? (
        <Card>
          <CardHeader
            title="Network structural patterns"
            description="Automatically detected hubs, bridges, and dense cells in the intelligence graph"
            action={
              <Button variant="outline" size="sm" onClick={() => loadGraphInsights(selectedCaseId || undefined)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            }
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {networkPatterns.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-surface-raised/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{p.title}</span>
                    <Badge variant={p.severity === "CRITICAL" ? "danger" : p.severity === "HIGH" ? "warning" : "info"} className="text-[10px] shrink-0">
                      {p.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{p.description}</p>
                  <div className="text-[11px] text-muted border-t border-border pt-2">
                    <span className="font-semibold text-foreground">Metrics: </span>{p.metricDetail}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.involvedEntityNames.slice(0, 3).map((name, i) => (
                      <span key={i} className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">{name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── SECTION 5: Detected Patterns + Summary Generator ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Patterns list */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Detected intelligence patterns"
            description="Potentially significant patterns — click 'why' for explanation"
          />
          <CardContent>
            {loading ? (
              <LoadingState label="Loading patterns…" />
            ) : patterns.length === 0 ? (
              <EmptyState title="No patterns detected" description="Run an analysis on a case to generate patterns." />
            ) : (
              <div className="space-y-2.5">
                {patterns.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[p.severity] ?? "default"}>{p.severity}</Badge>
                      <span className="text-sm font-medium text-foreground">{p.title}</span>
                      {/* Relevance bar */}
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded bg-surface-raised overflow-hidden">
                          <div
                            className="h-full rounded bg-accent"
                            style={{ width: `${p.relevance}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted">{p.relevance}%</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-muted">{p.summary}</p>
                    <button
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {expanded === p.id ? "Hide explanation" : "Why was this flagged?"}
                    </button>
                    {expanded === p.id ? (
                      <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-accent">Explainability</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded border border-border bg-surface p-2">
                            <div className="text-[10px] text-muted">Pattern Type</div>
                            <div className="font-mono font-bold text-foreground">{p.type}</div>
                          </div>
                          <div className="rounded border border-border bg-surface p-2">
                            <div className="text-[10px] text-muted">Relevance Score</div>
                            <div className="font-mono font-bold text-accent">{p.relevance}%</div>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted">
                          AI-generated insights are investigative leads and require human verification. This is not a determination of guilt.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary generator */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Investigation summary" description="Generate an explainable AI summary for a case" />
            <CardContent className="space-y-3">
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.caseId} — {c.title}</option>
                ))}
              </select>
              <Button className="w-full" onClick={generateSummary} disabled={generating || !selectedCaseId}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {generating ? "Generating…" : "Generate summary"}
              </Button>
            </CardContent>
          </Card>

          {summary ? (
            <Card>
              <CardHeader title="AI Summary" description={summary.caveat} />
              <CardContent className="space-y-3 text-xs">
                <SummarySection label="Overview" items={[summary.overview]} />
                <SummarySection label="Key entities" items={summary.keyEntities} />
                <SummarySection label="Major relationships" items={summary.majorRelationships} />
                <SummarySection label="Important patterns" items={summary.importantPatterns} />
                <SummarySection label="Timeline highlights" items={summary.timelineHighlights} />
                <SummarySection label="Investigation areas" items={summary.investigationAreas} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* ── SECTION 6: AI Investigation Leads ── */}
      {leads.length > 0 ? (
        <Card>
          <CardHeader
            title="AI investigation leads"
            description="Suggested areas for the investigator to review — requires human verification"
            action={<ListChecks className="h-4 w-4 text-muted" />}
          />
          <CardContent>
            <ol className="grid gap-2 sm:grid-cols-2">
              {leads.map((l, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-border bg-surface-raised/40 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{l.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummarySection({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="text-foreground/80">• {it}</li>
        ))}
      </ul>
    </div>
  );
}
