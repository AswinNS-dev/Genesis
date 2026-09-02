"use client";

import { useEffect, useState } from "react";
import {
  FileText, Printer, Loader2, ShieldCheck, Download,
  ClipboardCopy, Check, AlertCircle, Search,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Matches InvestigationReport from backend/services/report.service.ts
type ReportData = {
  generatedAt: string;
  generatedBy: string;
  caseId: string;
  caseTitle: string;
  status: string;
  classification: string;
  summary: string;
  subjects: { name: string; type: string; riskScore: number; aliases: string[] }[];
  organizations: { name: string; type: string }[];
  locations: { name: string; type: string }[];
  relationships: { type: string; source: string; target: string; count: number; strength: number }[];
  evidence: { name: string; sha256: string | null; status: string; verified: boolean; uploadedAt: string }[];
  notes: { body: string; author: string | null; createdAt: string }[];
  patterns: { type: string; title: string; severity: string; summary: string }[];
  timeline: { summary: string; eventAt: string; type: string }[];
  recommendation: string;
};

type Case = { id: string; caseId: string; title: string; status: string };

export default function ReportsPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setCasesLoading(true);
      setCasesError("");
      try {
        const res = await fetch("/api/intel-data?scope=cases");
        if (!res.ok) { setCasesError("Failed to load cases."); return; }
        const d = await res.json();
        const list: Case[] = d.cases ?? [];
        setCases(list);
        if (list.length > 0) setSelectedCaseId(list[0].id);
      } catch {
        setCasesError("Network error loading cases.");
      } finally {
        setCasesLoading(false);
      }
    })();
  }, []);

  async function generate() {
    if (!selectedCaseId) return;
    setGenerating(true);
    setReport(null);
    setGenError("");
    try {
      const res = await fetch(`/api/reports?caseId=${selectedCaseId}`);
      const d = await res.json();
      if (!res.ok) { setGenError(d.error ?? "Report generation failed."); return; }
      setReport(d.report);
    } catch {
      setGenError("Network error generating report.");
    } finally {
      setGenerating(false);
    }
  }

  const filteredCases = cases.filter(
    (c) =>
      !search ||
      c.caseId.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0">
      <div className="print:hidden">
        <PageHeader
          title="Report Generator"
          description="Structured investigation report with network, timeline, AI findings and evidence manifest."
          icon={FileText}
          badge="Audited"
          badgeVariant="success"
        />
      </div>

      {!report ? (
        <Card className="print:hidden">
          <CardHeader title="Generate Investigation Report" description="Select a case to produce a structured report from real investigation data." />
          <CardContent className="space-y-4">
            {casesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading cases…
              </div>
            ) : casesError ? (
              <div className="flex items-center gap-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4" /> {casesError}
              </div>
            ) : cases.length === 0 ? (
              <p className="text-sm text-muted">No investigation cases found in the database.</p>
            ) : (
              <>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search cases…"
                    className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="h-9 w-full max-w-md rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {filteredCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseId} — {c.title} [{c.status}]
                    </option>
                  ))}
                </select>
                {genError ? (
                  <div className="flex items-center gap-2 text-sm text-danger">
                    <AlertCircle className="h-4 w-4" /> {genError}
                  </div>
                ) : null}
                <Button onClick={generate} disabled={generating || !selectedCaseId}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {generating ? "Generating…" : "Generate Report"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <ReportView report={report} onBack={() => setReport(null)} />
      )}
    </div>
  );
}

function toMarkdown(r: ReportData): string {
  const lines: string[] = [
    `# CrimeIntel · Investigation Report — ${r.caseId}`,
    "",
    `**Title:** ${r.caseTitle} · **Status:** ${r.status} · **Classification:** ${r.classification}`,
    `**Generated:** ${new Date(r.generatedAt).toLocaleString()} by ${r.generatedBy}`,
    "",
    "> FOR INVESTIGATIVE DECISION-SUPPORT ONLY. AI outputs require human verification.",
    "",
    "## 1. Summary",
    "",
    r.summary,
    "",
    "## 2. Subjects",
    "",
    ...r.subjects.map((s) => `- ${s.name} (risk: ${s.riskScore})${s.aliases.length ? ` · aliases: ${s.aliases.join(", ")}` : ""}`),
    ...(r.subjects.length === 0 ? ["- No subjects identified."] : []),
    "",
    "## 3. Organisations",
    "",
    ...r.organizations.map((o) => `- ${o.name}`),
    ...(r.organizations.length === 0 ? ["- None."] : []),
    "",
    "## 4. Locations",
    "",
    ...r.locations.map((l) => `- ${l.name}`),
    ...(r.locations.length === 0 ? ["- None."] : []),
    "",
    "## 5. Relationships",
    "",
    ...r.relationships.map((rel) => `- ${rel.source} ↔ ${rel.target} · ${rel.type} · strength ${rel.strength}% · ${rel.count} record(s)`),
    ...(r.relationships.length === 0 ? ["- No relationships recorded."] : []),
    "",
    "## 6. Timeline",
    "",
    ...r.timeline.map((e) => `- ${new Date(e.eventAt).toLocaleDateString()} — ${e.summary}`),
    ...(r.timeline.length === 0 ? ["- No timeline events."] : []),
    "",
    "## 7. AI / Pattern Findings",
    "",
    ...r.patterns.map((p) => `- [${p.severity}] ${p.title} — ${p.summary}`),
    ...(r.patterns.length === 0 ? ["- No patterns detected."] : []),
    "",
    "## 8. Evidence Manifest",
    "",
    ...r.evidence.map((e) => `- ${e.name} · ${e.status} · verified=${e.verified}`),
    ...(r.evidence.length === 0 ? ["- No evidence documents."] : []),
    "",
    "## 9. Recommendation",
    "",
    r.recommendation,
    "",
    "CrimeIntel · FOR INVESTIGATIVE DECISION-SUPPORT ONLY · Requires human verification",
  ];
  return lines.join("\n");
}

function ReportView({ report: r, onBack }: { report: ReportData; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(toMarkdown(r));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.caseId}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="max-w-3xl print:max-w-none print:shadow-none print:border-0">
      <CardContent className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button size="sm" variant="outline" onClick={onBack}>← Back</Button>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copyMarkdown}>
              {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy markdown"}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadJson}>
              <Download className="h-4 w-4" /> JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">CrimeIntel · Investigation Report</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{r.caseId} — {r.caseTitle}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Status: {r.status}</span>
            <span>·</span>
            <span>Classification: {r.classification}</span>
            <span>·</span>
            <span>Generated: {new Date(r.generatedAt).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">Generated by {r.generatedBy}</p>
          <p className="mt-2 text-[11px] text-muted">
            FOR INVESTIGATIVE DECISION-SUPPORT ONLY — AI outputs require human verification. No determination of culpability is made.
          </p>
        </div>

        <Section index="1" title="Summary">
          <p className="text-sm text-muted">{r.summary || "No summary available."}</p>
        </Section>

        <Section index="2" title="Subjects">
          {r.subjects.length === 0 ? (
            <p className="text-sm text-muted">No subjects identified.</p>
          ) : (
            <div className="space-y-2">
              {r.subjects.map((s, i) => (
                <div key={i} className="rounded border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <Badge variant={s.riskScore >= 70 ? "danger" : s.riskScore >= 40 ? "warning" : "outline"}>
                      Risk {s.riskScore}
                    </Badge>
                  </div>
                  {s.aliases.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted">Aliases: {s.aliases.join(", ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>

        {r.organizations.length > 0 ? (
          <Section index="3" title="Organisations">
            <div className="flex flex-wrap gap-1.5">
              {r.organizations.map((o, i) => (
                <span key={i} className="rounded border border-border px-2 py-0.5 text-xs text-foreground">{o.name}</span>
              ))}
            </div>
          </Section>
        ) : null}

        {r.locations.length > 0 ? (
          <Section index="4" title="Locations">
            <div className="flex flex-wrap gap-1.5">
              {r.locations.map((l, i) => (
                <span key={i} className="rounded border border-border px-2 py-0.5 text-xs text-foreground">{l.name}</span>
              ))}
            </div>
          </Section>
        ) : null}

        <Section index="5" title="Relationships">
          {r.relationships.length === 0 ? (
            <p className="text-sm text-muted">No relationships recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.relationships.map((rel, i) => (
                <li key={i} className="text-foreground/80">
                  {rel.source} ↔ {rel.target}
                  <span className="text-muted"> · {rel.type.toLowerCase()} · strength {rel.strength}% · {rel.count} record(s)</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section index="6" title="Timeline">
          {r.timeline.length === 0 ? (
            <p className="text-sm text-muted">No timeline events.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.timeline.map((e, i) => (
                <li key={i} className="text-foreground/80">
                  <span className="font-mono text-xs text-muted">{new Date(e.eventAt).toLocaleDateString()} </span>
                  {e.summary}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section index="7" title="AI / Pattern Findings">
          {r.patterns.length === 0 ? (
            <p className="text-sm text-muted">No patterns detected for this case.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {r.patterns.map((p, i) => (
                <li key={i} className="rounded border border-border p-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Badge variant={p.severity === "HIGH" ? "danger" : p.severity === "MEDIUM" ? "warning" : "info"}>
                      {p.severity}
                    </Badge>
                    {p.title}
                  </div>
                  <p className="mt-1 text-xs text-muted">{p.summary}</p>
                </li>
              ))}
              <li className="text-[11px] text-muted">AI-generated insights are investigative leads and require human verification.</li>
            </ul>
          )}
        </Section>

        <Section index="8" title="Evidence Manifest">
          {r.evidence.length === 0 ? (
            <p className="text-sm text-muted">No evidence documents linked to this case.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {r.evidence.map((ex, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5">
                  <ShieldCheck className={ex.verified ? "h-4 w-4 text-success" : "h-4 w-4 text-muted"} />
                  <span className="text-foreground/80">{ex.name}</span>
                  <Badge variant="outline">{ex.status}</Badge>
                  <span className="ml-auto text-[11px] text-muted">
                    {ex.verified ? "verified" : "unverified"}
                    {ex.sha256 ? ` · ${ex.sha256.slice(0, 12)}…` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {r.notes.length > 0 ? (
          <Section index="9" title="Investigator Notes">
            <ul className="space-y-2 text-sm">
              {r.notes.map((n, i) => (
                <li key={i} className="rounded border border-border px-3 py-2">
                  <p className="text-foreground/80">{n.body}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {n.author ?? "Unknown"} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section index={r.notes.length > 0 ? "10" : "9"} title="Recommendation">
          <p className="text-sm text-foreground/80">{r.recommendation}</p>
        </Section>

        <div className="pt-3 text-center text-[10px] text-muted">
          CrimeIntel · FOR INVESTIGATIVE DECISION-SUPPORT ONLY · Requires human verification
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, index, children }: { title: string; index: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">
        <span className="mr-1.5 text-muted">{index}.</span>{title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
