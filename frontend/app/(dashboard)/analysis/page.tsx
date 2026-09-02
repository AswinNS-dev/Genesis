"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Radar,
  LayoutGrid,
  Share2,
  CalendarDays,
  MapPin,
  Phone,
  Coins,
  Sparkles,
  Loader2,
  FileText,
  ExternalLink,
  BrainCircuit,
  Eye,
  Users2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type Case = { id: string; caseId: string; title: string; status: string };
type Pattern = {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  relevance: number;
  createdAt: string;
};
type NodeItem = { id: string; label: string; type: string };
type LinkItem = { source: string; target: string; type: string };
type EventItem = { id: string; type: string; summary: string; eventAt: string; entityName: string | null; caseId: string | null };
type LocationItem = { id: string; name: string; entities: { name: string; type: string }[]; activity: number };
type CommItem = { id: string; caller: string; receiver: string; count: number; strength: number };
type TransactionItem = { id: string; sender: string; receiver: string; count: number; strength: number };
type Summary = {
  overview: string;
  keyEntities: string[];
  majorRelationships: string[];
  importantPatterns: string[];
  timelineHighlights: string[];
  investigationAreas: string[];
  caveat: string;
};
type AnomalyItem = { type: string; title: string; severity: string; confidence: number };

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "default"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "info",
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "network", label: "Network", icon: Share2 },
  { key: "timeline", label: "Timeline", icon: CalendarDays },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "communications", label: "Communications", icon: Phone },
  { key: "transactions", label: "Transactions", icon: Coins },
  { key: "patterns", label: "Patterns", icon: BrainCircuit },
  { key: "ai", label: "AI Insights", icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AnalysisWorkspacePage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [communications, setCommunications] = useState<CommItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leads, setLeads] = useState<{ title: string; detail: string }[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, p, n, t, l, comm, tx] = await Promise.all([
        fetch("/api/intel-data?scope=cases").then((r) => r.json()),
        fetch("/api/intel-data?scope=patterns").then((r) => r.json()),
        fetch("/api/intel-data?scope=network").then((r) => r.json()),
        fetch("/api/intel-data?scope=timeline").then((r) => r.json()),
        fetch("/api/intel-data?scope=locations").then((r) => r.json()),
        fetch("/api/intel-data?scope=communications").then((r) => r.json()),
        fetch("/api/intel-data?scope=transactions").then((r) => r.json()),
      ]);
      setCases(c.cases ?? []);
      setPatterns(p.patterns ?? []);
      setNodes(n.nodes ?? []);
      setLinks(n.links ?? []);
      setEvents(t.events ?? []);
      setLocations(l.locations ?? []);
      setCommunications(comm.communications ?? []);
      setTransactions(tx.transactions ?? []);
      setSelectedCaseId(c.cases?.[0]?.id ?? "");
      setLoading(false);
    })();
  }, []);

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
      setAnomalies(data.anomalies ?? []);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analysis"
        description="Unified investigative analytics — network, timeline, locations, communications, transactions, patterns and AI insights."
        icon={Radar}
        badge="Workspace"
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-accent/12 text-accent ring-1 ring-accent/20"
                  : "text-muted hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState label="Loading analysis workspace…" />
      ) : (
        <div className="space-y-6">
          {tab === "overview" ? (
            <OverviewTab
              cases={cases}
              selectedCaseId={selectedCaseId}
              setSelectedCaseId={setSelectedCaseId}
              summary={summary}
              leads={leads}
              generating={generating}
              onGenerate={generateSummary}
            />
          ) : null}

          {tab === "network" ? <NetworkTab nodes={nodes} links={links} /> : null}

          {tab === "timeline" ? <TimelineTab events={events} /> : null}

          {tab === "locations" ? <LocationsTab locations={locations} /> : null}

          {tab === "communications" ? <CommunicationsTab communications={communications} /> : null}

          {tab === "transactions" ? <TransactionsTab transactions={transactions} /> : null}

          {tab === "patterns" ? <PatternsTab patterns={patterns} /> : null}

          {tab === "ai" ? (
            <AiInsightsTab
              summary={summary}
              leads={leads}
              anomalies={anomalies}
              generating={generating}
              selectedCaseId={selectedCaseId}
              setSelectedCaseId={setSelectedCaseId}
              onGenerate={generateSummary}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ModuleLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-surface-raised"
    >
      Open full view
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

function NetworkTab({ nodes, links }: { nodes: NodeItem[]; links: LinkItem[] }) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const degrees = useMemo(() => {
    const d = new Map<string, number>();
    for (const l of links) {
      d.set(l.source, (d.get(l.source) ?? 0) + 1);
      d.set(l.target, (d.get(l.target) ?? 0) + 1);
    }
    return d;
  }, [links]);

  const mostConnected = useMemo(
    () =>
      nodes
        .map((n) => ({ node: n, degree: degrees.get(n.id) ?? 0 }))
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 8),
    [nodes, degrees]
  );

  const topEdges = useMemo(
    () => [...links].sort((a, b) => (a.type > b.type ? 1 : -1)).slice(0, 40),
    [links]
  );

  const avgDegree = nodes.length ? (links.length * 2) / nodes.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entities" value={nodes.length} />
        <Stat label="Relationships" value={links.length} />
        <Stat label="Entity types" value={new Set(nodes.map((n) => n.type)).size} />
        <Stat label="Avg. degree" value={avgDegree.toFixed(1)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Most connected entities"
            description="Entities with the highest graph degree"
            action={<Users2 className="h-4 w-4 text-muted" />}
          />
          <CardContent className="space-y-2">
            {mostConnected.length === 0 ? (
              <EmptyState title="No entities" />
            ) : (
              mostConnected.map(({ node, degree }) => (
                <Link
                  key={node.id}
                  href={`/entities/${node.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 p-3 transition-colors hover:border-accent/40"
                >
                  <span className="text-sm font-medium text-foreground">{node.label}</span>
                  <Badge variant="outline" className="ml-auto">{node.type}</Badge>
                  <Badge variant="success">{degree} links</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Relationship pairs"
            description="Edges across the intelligence graph"
            action={<ModuleLink href="/network" />}
          />
          <CardContent className="space-y-1.5">
            {topEdges.length === 0 ? (
              <EmptyState title="No relationships" />
            ) : (
              topEdges.map((l, i) => {
                const s = nodeById.get(l.source);
                const t = nodeById.get(l.target);
                if (!s || !t) return null;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-raised">
                    <Badge variant="outline" className="w-28 justify-center text-[10px]">{l.type.toLowerCase()}</Badge>
                    <span className="truncate text-xs text-foreground">
                      {s.label} → {t.label}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimelineTab({ events }: { events: EventItem[] }) {
  const types = useMemo(() => Array.from(new Set(events.map((e) => e.type))), [events]);
  const [filter, setFilter] = useState<string>("ALL");
  const visible = useMemo(() => {
    const list = filter === "ALL" ? events : events.filter((e) => e.type === filter);
    return [...list].sort((a, b) => (a.eventAt < b.eventAt ? 1 : -1));
  }, [events, filter]);

  return (
    <Card>
      <CardHeader
        title="Timeline"
        description={`Chronological event feed · ${visible.length} of ${events.length} events`}
        action={<ModuleLink href="/timeline" />}
      />
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-1">
          <FilterChip active={filter === "ALL"} label="All" onClick={() => setFilter("ALL")} />
          {types.map((t) => (
            <FilterChip key={t} active={filter === t} label={t.toLowerCase()} onClick={() => setFilter(t)} />
          ))}
        </div>
        {visible.length === 0 ? (
          <EmptyState title="No timeline events" description="Events will appear as cases progress." />
        ) : (
          <ol className="space-y-2">
            {visible.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <span className="flex flex-col items-center justify-start pt-1">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  {i < visible.length - 1 ? <span className="h-full w-px bg-border" /> : null}
                </span>
                <div className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.type}</Badge>
                    <span className="text-sm font-medium text-foreground">{e.summary}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {e.entityName ? `${e.entityName} · ` : ""}
                    {e.caseId ?? ""} · {new Date(e.eventAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function LocationsTab({ locations }: { locations: LocationItem[] }) {
  const maxActivity = Math.max(...locations.map((l) => l.activity), 1);
  return (
    <Card>
      <CardHeader
        title="Locations"
        description="Location-centric intelligence across cases"
        action={<ModuleLink href="/locations" />}
      />
      <CardContent>
        {locations.length === 0 ? (
          <EmptyState title="No locations linked" description="Locations appear once entities are linked to them." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {locations.map((loc) => (
              <div key={loc.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">{loc.name}</span>
                  <Badge variant="outline" className="ml-auto">activity {loc.activity}</Badge>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border/60">
                  <div
                    className="h-1.5 rounded-full bg-accent/70"
                    style={{ width: `${Math.min(100, (loc.activity / maxActivity) * 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {loc.entities.map((e) => (
                    <Badge key={e.name} variant="outline">{e.name}</Badge>
                  ))}
                  {loc.entities.length === 0 ? <span className="text-[11px] text-muted">No entities linked</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommunicationsTab({ communications }: { communications: CommItem[] }) {
  const sorted = useMemo(() => [...communications].sort((a, b) => b.count - a.count), [communications]);
  const maxCount = Math.max(...sorted.map((c) => c.count), 1);
  const total = sorted.reduce((acc, c) => acc + c.count, 0);
  return (
    <Card>
      <CardHeader
        title="Communications"
        description={`Call-volume and frequency analysis · ${sorted.length} pairs, ${total} events`}
        action={<ModuleLink href="/communications" />}
      />
      <CardContent className="space-y-2">
        {sorted.length === 0 ? (
          <EmptyState title="No communication records" description="Call records will appear after extraction." />
        ) : (
          sorted.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {c.caller} <span className="text-muted">→</span> {c.receiver}
                </span>
                <span className="ml-auto text-xs text-muted">strength {c.strength}</span>
                <Badge variant="outline">{c.count} calls</Badge>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-border/60">
                <div
                  className="h-1.5 rounded-full bg-accent/70"
                  style={{ width: `${Math.min(100, (c.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TransactionsTab({ transactions }: { transactions: TransactionItem[] }) {
  const sorted = useMemo(() => [...transactions].sort((a, b) => b.strength - a.strength), [transactions]);
  const maxStrength = Math.max(...sorted.map((t) => t.strength), 1);
  return (
    <Card>
      <CardHeader
        title="Transactions"
        description={`Financial trails and flow strength · ${sorted.length} paths`}
        action={<ModuleLink href="/transactions" />}
      />
      <CardContent className="space-y-2">
        {sorted.length === 0 ? (
          <EmptyState title="No transaction records" description="Financial records will appear after upload & extraction." />
        ) : (
          sorted.map((tx) => (
            <div key={tx.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
              <div className="flex items-center gap-3">
                <Coins className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {tx.sender} <span className="text-muted">→</span> {tx.receiver}
                </span>
                <span className="ml-auto text-xs text-muted">{tx.count} record{tx.count === 1 ? "" : "s"}</span>
                <Badge variant="outline">strength {tx.strength}</Badge>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-border/60">
                <div
                  className="h-1.5 rounded-full bg-accent/70"
                  style={{ width: `${Math.min(100, (tx.strength / maxStrength) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
      <p className="text-2xl font-semibold text-accent">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-muted hover:bg-surface-raised hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function OverviewTab({
  cases,
  selectedCaseId,
  setSelectedCaseId,
  summary,
  leads,
  generating,
  onGenerate,
}: {
  cases: Case[];
  selectedCaseId: string;
  setSelectedCaseId: (id: string) => void;
  summary: Summary | null;
  leads: { title: string; detail: string }[];
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Case overview"
          description="Select a case and generate an explainable AI summary"
        />
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseId} — {c.title}
                </option>
              ))}
            </select>
            <Button onClick={onGenerate} disabled={generating || !selectedCaseId}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating ? "Analyzing…" : "Analyze"}
            </Button>
          </div>

          {summary ? (
            <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
              <SummarySection label="Overview" items={[summary.overview]} />
              <SummarySection label="Key entities" items={summary.keyEntities} />
              <SummarySection label="Major relationships" items={summary.majorRelationships} />
              <SummarySection label="Important patterns" items={summary.importantPatterns} />
              <SummarySection label="Timeline highlights" items={summary.timelineHighlights} />
              <p className="text-[11px] italic text-muted">{summary.caveat}</p>
            </div>
          ) : (
            <EmptyState
              title="No analysis yet"
              description="Select a case above and run the analysis pipeline to surface summaries, patterns and leads."
            />
          )}
        </CardContent>
      </Card>

      {leads.length > 0 ? (
        <Card>
          <CardHeader title="Investigation leads" description="Suggested areas to review" />
          <CardContent>
            <ol className="space-y-2">
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

function PatternsTab({ patterns }: { patterns: Pattern[] }) {
  const [items, setItems] = useState<Pattern[]>(patterns);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function runDetection() {
    setRunning(true);
    try {
      const res = await fetch("/api/analysis/detect", { method: "POST" });
      const data = await res.json();
      const fresh = await fetch("/api/intel-data?scope=patterns").then((r) => r.json());
      setItems(fresh.patterns ?? []);
      setLastRun(
        `${data.patterns?.length ?? 0} patterns (${data.created ?? 0} new, ${data.updated ?? 0} refreshed) · ${data.anomalies?.length ?? 0} anomalies · ${data.alertsCreated ?? 0} alerts`
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runDetection} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
            {running ? "Detecting…" : "Run detection across all cases"}
          </Button>
          <span className="text-[11px] text-muted">
            {lastRun
              ? `Last run: ${lastRun}.`
              : "Detectors: repeated communication · co-location · shared vehicle · cross-case recurrence · multi-source footprint · transaction chains."}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Detected patterns"
          description="Potentially significant patterns — click 'why' for explanation"
        />
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="No patterns detected" description="Run a detection to generate patterns across all cases." />
          ) : (
            <div className="space-y-2.5">
              {items.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[p.severity] ?? "default"}>{p.severity}</Badge>
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <Badge variant="outline" className="ml-auto">relevance {p.relevance}%</Badge>
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
                    <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                      <p className="text-xs font-semibold text-accent">Reasons</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted">
                        <li>✓ Pattern: {p.type}</li>
                        <li>✓ Relevance: {p.relevance}%</li>
                        <li>✓ Requires human review before any action</li>
                      </ul>
                      <p className="mt-2 text-[11px] text-muted">
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
    </div>
  );
}

function AiInsightsTab({
  summary,
  leads,
  anomalies,
  generating,
  selectedCaseId,
  setSelectedCaseId,
  onGenerate,
}: {
  summary: Summary | null;
  leads: { title: string; detail: string }[];
  anomalies: AnomalyItem[];
  generating: boolean;
  selectedCaseId: string;
  setSelectedCaseId: (id: string) => void;
  onGenerate: () => void;
}) {
  const [cases, setCases] = useState<Case[]>([]);
  const [alerts, setAlerts] = useState<
    { id: string; severity: string; message: string; detail: string | null; read: boolean; createdAt: string }[]
  >([]);
  useEffect(() => {
    (async () => {
      const [c, a] = await Promise.all([
        fetch("/api/intel-data?scope=cases").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json()),
      ]);
      setCases(c.cases ?? []);
      setAlerts(a.alerts ?? []);
      if (!selectedCaseId && c.cases?.[0]) setSelectedCaseId(c.cases[0].id);
    })();
  }, [selectedCaseId, setSelectedCaseId]);

  const unread = alerts.filter((al) => !al.read);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="AI Insights"
          description="Explainable summary and investigation leads"
          action={unread.length ? <Badge variant="danger">{unread.length} unread alert{unread.length === 1 ? "" : "s"}</Badge> : null}
        />
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseId} — {c.title}
                </option>
              ))}
            </select>
            <Button onClick={onGenerate} disabled={generating || !selectedCaseId}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate insights"}
            </Button>
          </div>

          {summary ? (
            <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
              <SummarySection label="Overview" items={[summary.overview]} />
              <SummarySection label="Key entities" items={summary.keyEntities} />
              <SummarySection label="Major relationships" items={summary.majorRelationships} />
              <SummarySection label="Important patterns" items={summary.importantPatterns} />
              <SummarySection label="Timeline highlights" items={summary.timelineHighlights} />
              <SummarySection label="Investigation areas" items={summary.investigationAreas} />
              <p className="text-[11px] italic text-muted">{summary.caveat}</p>
            </div>
          ) : (
            <EmptyState
              title="No insights generated"
              description="Select a case and generate an explainable AI summary and leads."
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Investigation leads" description="Generated from the selected case" />
          <CardContent>
            {leads.length === 0 ? (
              <EmptyState title="No leads yet" description="Generated leads will appear here." />
            ) : (
              <ol className="space-y-2">
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Detected anomalies" description="Statistical outliers above baseline" />
          <CardContent>
            {anomalies.length === 0 ? (
              <EmptyState title="No anomalies recorded" description="Run an analysis or pattern detection to surface anomalies." />
            ) : (
              <ul className="space-y-2">
                {anomalies.map((a, i) => (
                  <li key={i} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[a.severity] ?? "default"}>{a.severity}</Badge>
                      <span className="text-sm font-medium text-foreground">{a.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{a.type.toLowerCase()} · confidence {Math.round(a.confidence * 100)}%</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="AI alerts" description={`${alerts.length} recent alert(s)`} />
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState title="No alerts" description="Alerts are created by pattern and anomaly detection." />
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 8).map((al) => (
                  <li key={al.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[al.severity] ?? "default"}>{al.severity}</Badge>
                      <span className="text-xs font-medium text-foreground">{al.message}</span>
                      {!al.read ? <span className="ml-auto h-2 w-2 rounded-full bg-accent" /> : null}
                    </div>
                    {al.detail ? <p className="mt-1 text-[11px] text-muted">{al.detail}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummarySection({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
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