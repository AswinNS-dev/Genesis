"use client";

import { useEffect, useState } from "react";
import { Sparkles, Eye, Loader2, FileText, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";

type Pattern = {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  relevance: number;
  createdAt: string;
};
type Case = { id: string; caseId: string; title: string };

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "default"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "info",
};

export default function AiInsightsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [summary, setSummary] = useState<{
    overview: string;
    keyEntities: string[];
    majorRelationships: string[];
    importantPatterns: string[];
    timelineHighlights: string[];
    investigationAreas: string[];
    caveat: string;
  } | null>(null);
  const [leads, setLeads] = useState<{ title: string; detail: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        fetch("/api/intel-data?scope=patterns").then((r) => r.json()),
        fetch("/api/intel-data?scope=cases").then((r) => r.json()),
      ]);
      setPatterns(p.patterns ?? []);
      setCases(c.cases ?? []);
      setSelectedCaseId((c.cases?.[0]?.id) ?? "");
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
    } catch {
      setSummary(null);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AI Insights & Explainability"
        description="Patterns, explained leads, and investigation summaries — always presented as investigative leads."
        icon={Sparkles}
        badge="Explained AI"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Patterns */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Detected patterns"
            description="Potentially significant patterns — click 'why' for explanation"
          />
          <CardContent>
            {loading ? (
              <LoadingState label="Loading patterns…" />
            ) : patterns.length === 0 ? (
              <EmptyState
                title="No patterns detected"
                description="Run an analysis on a case to generate patterns."
              />
            ) : (
              <div className="space-y-2.5">
                {patterns.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[p.severity] ?? "default"}>{p.severity}</Badge>
                      <span className="text-sm font-medium text-foreground">{p.title}</span>
                      <Badge variant="outline" className="ml-auto">
                        relevance {p.relevance}%
                      </Badge>
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
                          {["Pattern:", p.type, `Relevance: ${p.relevance}%`].map((r) => (
                            <li key={r}>✓ {r}</li>
                          ))}
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

        {/* Summary generator */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Investigation summary" description="Generate an explainable AI summary" />
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

      {leads.length > 0 ? (
        <Card>
          <CardHeader
            title="AI investigation leads"
            description="Suggested areas for the investigator to review"
            action={<ListChecks className="h-4 w-4 text-muted" />}
          />
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
