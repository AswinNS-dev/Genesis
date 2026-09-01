"use client";

import { useEffect, useState } from "react";
import { FileText, Printer, Loader2, ShieldCheck, Download, ClipboardCopy, Check } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Case = { id: string; caseId: string; title: string; status: string };

type ReportData = {
  caseId: string;
  title: string;
  status: string;
  classification: string;
  assignedInvestigator: string | null;
  description: string | null;
  generatedAt: string;
  generatedBy: string;
  entities: { name: string; type: string }[];
  relationships: { a: string; b: string; type: string; strength: number; count: number; records: string[] }[];
  events: { summary: string; eventAt: string; type: string }[];
  patterns: { title: string; severity: string; summary: string; relevance: number }[];
  alerts: { severity: string; message: string; createdAt: string }[];
  exhibits: { name: string; status: string; verified: boolean; sha256: string; blockIndex: number | null; blockHash: string | null }[];
  attention: string[];
  crypto: { storedHash: string; blockIndex: number | null; verified: boolean };
  audit: string[];
};

export default function ReportsPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await fetch("/api/intel-data?scope=cases").then((r) => r.json());
      setCases(d.cases ?? []);
      setSelectedCaseId(d.cases?.[0]?.id ?? "");
    })();
  }, []);

  async function generate() {
    if (!selectedCaseId) return;
    setGenerating(true);
    setReport(null);
    try {
      const d = await fetch(`/api/reports?caseId=${selectedCaseId}`).then((r) => r.json());
      setReport(d.report);
    } catch {
      setReport(null);
    } finally {
      setGenerating(false);
    }
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0">
      <div className="print:hidden">
        <PageHeader
          title="Report Generator"
          description="Structured investigation report with network, timeline, AI findings and an evidence manifest. Export as PDF via print."
          icon={FileText}
          badge="Audited"
        />
      </div>

      {!report ? (
        <Card className="print:hidden">
          <CardHeader title="Generate a report" description="Select a case to produce a structured investigation report" />
          <CardContent className="space-y-3">
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="h-9 w-full max-w-md rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.caseId} — {c.title}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button onClick={generate} disabled={generating || !selectedCaseId}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {generating ? "Generating…" : "Generate report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ReportView report={report} onPrint={printReport} />
      )}
    </div>
  );
}

function toMarkdown(r: ReportData): string {
  const lines: string[] = [
    `# CrimeIntel · Investigation Report — ${r.caseId}`,
    "",
    `**Title:** ${r.title} · **Status:** ${r.status} · **Classification:** ${r.classification}`,
    `**Assigned investigator:** ${r.assignedInvestigator ?? "unassigned"}`,
    `**Generated:** ${new Date(r.generatedAt).toLocaleString()} by ${r.generatedBy}`,
    "",
    "> PROTOTYPE REPORT — All data fictional. AI outputs are investigative leads requiring human verification.",
    "",
    "## 1. Case overview",
    "",
    r.description ?? `Investigation into ${r.title}. No determination of culpability is made.`,
    "",
    "## 2. Entities",
    "",
    ...r.entities.map((e) => `- ${e.name} (${e.type.toLowerCase()})`),
    "",
    "## 3. Important relationships",
    "",
    ...r.relationships.map((rel) => `- ${rel.a} ↔ ${rel.b} · ${rel.type.toLowerCase()} · strength ${rel.strength}% · ${rel.count} record(s)`),
    "",
    "## 4. Timeline highlights",
    "",
    ...r.events.map((e) => `- ${new Date(e.eventAt).toLocaleDateString()} — ${e.summary}`),
    "",
    "## 5. AI findings",
    "",
    ...r.patterns.map((p) => `- [${p.severity}] ${p.title} (relevance ${p.relevance}%) — ${p.summary}`),
    ...(r.alerts.length ? ["", "### Related AI alerts", "", ...r.alerts.map((a) => `- [${a.severity}] ${a.message}`)] : []),
    "",
    "## 6. Evidence manifest",
    "",
    ...r.exhibits.map((e) => `- ${e.name} · ${e.status} · verified=${e.verified} · block #${e.blockIndex ?? "n/a"}`),
    "",
    "## 7. Follow-up attention",
    "",
    ...(r.attention.length ? r.attention.map((a) => `- [ ] ${a}`) : ["- No open attention items."]),
    "",
    "## 8. Blockchain integrity & audit",
    "",
    `- Evidence hash notarized on prototype ledger (block #${r.crypto.blockIndex})`,
    `- SHA-256: ${r.crypto.storedHash}`,
    ...r.audit.map((a) => `- ${a}`),
    "",
    "CrimeIntel Prototype · FOR INVESTIGATIVE DECISION-SUPPORT ONLY · Requires human verification",
    "",
  ];
  return lines.join("\n");
}

function ReportView({ report, onPrint }: { report: ReportData; onPrint: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(toMarkdown(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.caseId}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="max-w-3xl print:max-w-none print:shadow-none print:border-0">
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copyMarkdown}>
              {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy markdown"}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadJson}>
              <Download className="h-4 w-4" /> JSON
            </Button>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">CrimeIntel · Investigation Report</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{report.caseId} — {report.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Status: {report.status}</span>
            <span>·</span>
            <span>Classification: {report.classification}</span>
            <span>·</span>
            <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Assigned investigator: {report.assignedInvestigator ?? "unassigned"} · Generated by {report.generatedBy}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            PROTOTYPE REPORT — All data fictional. AI outputs are investigative leads requiring human verification.
          </p>
        </div>

        <ReportSection title="Case overview" index="1">
          <p className="text-sm text-muted">
            {report.description ?? `Investigation into ${report.title}. This report consolidates entities, relationships, timelines and AI findings for investigator review. No determination of culpability is made.`}
          </p>
        </ReportSection>

        <ReportSection title="Entities" index="2">
          <div className="flex flex-wrap gap-1.5">
            {report.entities.map((e, i) => (
              <span key={i} className="rounded border border-border px-2 py-0.5 text-xs text-foreground">
                {e.name} <span className="text-muted">({e.type.toLowerCase()})</span>
              </span>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Important relationships" index="3">
          <ul className="space-y-1 text-sm">
            {report.relationships.map((rel, i) => (
              <li key={i} className="text-foreground/80">
                {rel.a} ↔ {rel.b} <span className="text-muted">· {rel.type.toLowerCase()} · strength {rel.strength}% · {rel.count} record(s)</span>
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="Timeline highlights" index="4">
          <ul className="space-y-1 text-sm">
            {report.events.map((e, i) => (
              <li key={i} className="text-foreground/80">
                <span className="font-mono text-xs text-muted">{new Date(e.eventAt).toLocaleDateString()} </span>
                {e.summary}
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="AI findings" index="5">
          <ul className="space-y-2 text-sm">
            {report.patterns.map((p, i) => (
              <li key={i} className="rounded border border-border p-2">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {p.severity === "HIGH" ? <Badge variant="danger">high</Badge> : <Badge variant="warning">medium</Badge>}
                  {p.title}
                  <span className="ml-auto text-[11px] text-muted">relevance {p.relevance}%</span>
                </span>
                <p className="mt-1 text-xs text-muted">{p.summary}</p>
              </li>
            ))}
            {report.alerts.length ? (
              <li>
                <p className="text-xs font-semibold text-foreground">Related AI alerts</p>
                <ul className="mt-1 space-y-1">
                  {report.alerts.map((a, i) => (
                    <li key={i} className="text-xs text-muted">
                      <span className="font-bold">{a.severity}</span> — {a.message}
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
            <li className="text-[11px] text-muted">
              AI-generated insights are investigative leads and require human verification.
            </li>
          </ul>
        </ReportSection>

        <ReportSection title="Evidence manifest" index="6">
          <ul className="space-y-1.5 text-sm">
            {report.exhibits.map((ex, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5">
                <ShieldCheck className={ex.verified ? "h-4 w-4 text-success" : "h-4 w-4 text-muted"} />
                <span className="text-foreground/80">{ex.name}</span>
                <Badge variant="outline">{ex.status}</Badge>
                <span className="ml-auto text-[11px] text-muted">
                  {ex.verified ? "verified" : "unverified"} · block #{ex.blockIndex ?? "n/a"}
                </span>
              </li>
            ))}
            {report.exhibits.length === 0 ? (
              <li className="text-xs text-muted">No exhibits linked to this case yet.</li>
            ) : null}
          </ul>
        </ReportSection>

        <ReportSection title="Follow-up attention" index="7">
          <ul className="space-y-1 text-sm text-foreground/80">
            {report.attention.length ? (
              report.attention.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">TODO</span>
                  {a}
                </li>
              ))
            ) : (
              <li className="text-muted">No open attention items.</li>
            )}
          </ul>
        </ReportSection>

        <ReportSection title="Blockchain integrity & audit" index="8">
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-foreground/80">
              <ShieldCheck className="h-4 w-4 text-success" />
              Evidence hash notarized on prototype ledger (block #{report.crypto.blockIndex})
            </p>
            <p className="break-all font-mono text-[10px] text-muted">SHA-256: {report.crypto.storedHash}</p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {report.audit.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        </ReportSection>

        <div className="pt-3 text-center text-[10px] text-muted">
          CrimeIntel Prototype · FOR INVESTIGATIVE DECISION-SUPPORT ONLY · Requires human verification
        </div>
      </CardContent>
    </Card>
  );
}

function ReportSection({ title, index, children }: { title: string; index: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">
        <span className="mr-1.5 text-muted">{index}.</span>{title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
