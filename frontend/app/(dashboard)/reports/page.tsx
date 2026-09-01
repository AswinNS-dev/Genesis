"use client";

import { useEffect, useState } from "react";
import { FileText, Printer, Loader2, ShieldCheck, Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Case = { id: string; caseId: string; title: string; status: string };

export default function ReportsPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
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
          description="Structured investigation report with network, timeline and AI findings. Export as PDF via print."
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

function ReportView({ report, onPrint }: { report: Record<string, unknown>; onPrint: () => void }) {
  const r = report as unknown as {
    caseId: string;
    title: string;
    status: string;
    generatedAt: string;
    entities: { name: string; type: string }[];
    relationships: { a: string; b: string; type: string; strength: number }[];
    events: { summary: string; eventAt: string }[];
    patterns: { title: string; severity: string; summary: string }[];
    crypto: { storedHash: string; blockIndex: number; verified: boolean };
    audit: string[];
  };

  return (
    <Card className="max-w-3xl print:max-w-none print:shadow-none print:border-0">
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div />
          <div className="flex gap-2">
            <Button size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <Download className="h-4 w-4" /> New report
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">CrimeIntel · Investigation Report</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{r.caseId} — {r.title}</h2>
          <p className="text-xs text-muted">
            Status: {r.status} · Generated: {new Date(r.generatedAt).toLocaleString()}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            PROTOTYPE REPORT — All data fictional. AI outputs are investigative leads requiring human verification.
          </p>
        </div>

        <ReportSection title="Case overview" index="1">
          <p className="text-sm text-muted">
            Investigation into {r.title}. This report consolidates entities, relationships, timelines and AI findings
            for investigator review. No determination of culpability is made.
          </p>
        </ReportSection>

        <ReportSection title="Entities" index="2">
          <div className="flex flex-wrap gap-1.5">
            {r.entities.map((e, i) => (
              <span key={i} className="rounded border border-border px-2 py-0.5 text-xs text-foreground">
                {e.name} <span className="text-muted">({e.type.toLowerCase()})</span>
              </span>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Important relationships" index="3">
          <ul className="space-y-1 text-sm">
            {r.relationships.map((rel, i) => (
              <li key={i} className="text-foreground/80">
                {rel.a} ↔ {rel.b} <span className="text-muted">· {rel.type.toLowerCase()} · strength {rel.strength}%</span>
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="Timeline highlights" index="4">
          <ul className="space-y-1 text-sm">
            {r.events.map((e, i) => (
              <li key={i} className="text-foreground/80">
                <span className="font-mono text-xs text-muted">{new Date(e.eventAt).toLocaleDateString()} </span>
                {e.summary}
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="AI findings" index="5">
          <ul className="space-y-2 text-sm">
            {r.patterns.map((p, i) => (
              <li key={i} className="rounded border border-border p-2">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {p.severity === "HIGH" ? <Badge variant="danger">high</Badge> : <Badge variant="warning">medium</Badge>}
                  {p.title}
                </span>
                <p className="mt-1 text-xs text-muted">{p.summary}</p>
              </li>
            ))}
            <li className="text-[11px] text-muted">
              AI-generated insights are investigative leads and require human verification.
            </li>
          </ul>
        </ReportSection>

        <ReportSection title="Blockchain integrity & audit" index="6">
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-foreground/80">
              <ShieldCheck className="h-4 w-4 text-success" />
              Evidence hash notarized on prototype ledger (block #{r.crypto.blockIndex})
            </p>
            <p className="break-all font-mono text-[10px] text-muted">SHA-256: {r.crypto.storedHash}</p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {r.audit.map((a, i) => (
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
