"use client";

import { useState } from "react";
import { Loader2, Play, Sparkles, CheckCircle2, ShieldCheck, Combine, ScanSearch } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = ["Upload", "Field mapping", "Normalization", "Entity matching", "Review & merge"];

const SCOPE_OPTIONS = [
  {
    value: "COMBINED" as const,
    label: "Combine with case analysis",
    icon: Combine,
    hint: "Analyze this dataset together with the linked case's full context — patterns, relationships and anomalies surface at case level.",
  },
  {
    value: "DATASET_ONLY" as const,
    label: "Only this dataset",
    icon: ScanSearch,
    hint: "Restrict analysis to this dataset's own records and linked entities — isolate this source's footprint.",
  },
];

type Scope = "COMBINED" | "DATASET_ONLY";

const SAMPLE_CSV = `name,phone,register_date,address,city
Rahul Kumar,+91 98765 12345,2026-02-14,"Sector 18, Delhi",Delhi
Amit Sharma,+91 98220 13345,2026-02-13,"Central Market, Delhi",Delhi
Vikram Rao,+91 99887 76655,2026-02-11,"Industrial Area, Faridabad",Faridabad
Sandeep Bhardwaj,+91 90000 11111,2026-02-09,"Vasant Vihar, Delhi",Delhi
Arjun Mehta,+91 91234 56789,2026-02-08,"Nehru Place, New Delhi",Delhi`;

type CaseOption = { id: string; caseId: string; title: string };

export function IngestPanel({ cases, onIngested }: { cases: CaseOption[]; onIngested?: () => void }) {
  const [sourceType, setSourceType] = useState<"CSV" | "JSON" | "TXT">("CSV");
  const [caseId, setCaseId] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<Scope>("COMBINED");
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(-1);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const datasetOnlyNeedsCase = scope === "DATASET_ONLY" && !caseId;
  const canRun = content.trim().length > 0 && !running && !datasetOnlyNeedsCase;

  async function run() {
    if (!canRun) return;
    setRunning(true);
    setResult(null);
    setError(null);

    // Progress the UI through the pipeline stages as the backend runs
    // each audited stage. Matching/review statuses reflect current state.
    const tick = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, PIPELINE_STAGES.length - 1));
    }, 650);
    setStageIdx(0);

    try {
      const res = await fetch("/api/datasets/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          sourceType,
          fileName: fileName || undefined,
          caseId: caseId || undefined,
          analysisScope: scope,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pipeline failed");
      setStageIdx(PIPELINE_STAGES.length - 1);
      setResult(`${data.dataset.name} — ${data.summary?.total ?? 0} record${(data.summary?.total ?? 0) === 1 ? "" : "s"} ingested (${data.normalizedFields?.length ?? 0} normalized fields) · scope: ${data.dataset.analysisScope === "DATASET_ONLY" ? "dataset-only" : "combined"}`);
      setFileName("");
      setContent("");
      onIngested?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      clearInterval(tick);
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Ingest a source"
        description="Paste structured content or load the fictional sample. Parsing, mapping and normalization run on the backend."
        action={
          <button
            type="button"
            onClick={() => setContent(SAMPLE_CSV)}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5" /> Load sample CSV
          </button>
        }
      />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-surface-raised/40 p-1">
            {(["CSV", "JSON", "TXT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSourceType(t)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                  sourceType === t ? "bg-accent text-background" : "text-muted hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {cases.length > 0 ? (
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="max-w-56 rounded-lg border border-border bg-surface-raised/60 px-2 py-1.5 text-xs text-foreground outline-none"
            >
              <option value="">No case link (global)</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseId} — {c.title}
                </option>
              ))}
            </select>
          ) : null}

          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Optional file name"
            className="w-56 rounded-lg border border-border bg-surface-raised/60 px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Analysis scope</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SCOPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = scope === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScope(opt.value)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                    active ? "border-accent/40 bg-accent/5" : "border-border hover:bg-surface-raised/60"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-accent" : "text-muted")} />
                  <div>
                    <p className={cn("text-xs font-medium", active ? "text-accent" : "text-foreground")}>{opt.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted">{opt.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {datasetOnlyNeedsCase ? (
            <p className="flex items-center gap-1 text-[11px] text-amber-300/80">
              <ShieldCheck className="h-3 w-3" /> &ldquo;Only this dataset&rdquo; requires linking to a case — choose one above.
            </p>
          ) : null}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Paste ${sourceType} source content here…`}
          rows={8}
          className="w-full resize-y rounded-lg border border-border bg-surface-raised/60 p-3 font-mono text-[11px] leading-relaxed text-foreground outline-none placeholder:text-muted focus:border-accent/50"
        />

        {running ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="text-sm font-medium text-foreground">Running pipeline…</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PIPELINE_STAGES.map((s, i) => (
                <Badge
                  key={s}
                  variant={i <= stageIdx ? "success" : "outline"}
                  className={cn("gap-1", i === stageIdx ? "animate-pulse" : "")}
                >
                  {i < stageIdx ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={run} disabled={!canRun}>
                <Play className="h-3.5 w-3.5" /> Run pipeline
              </Button>
              {fileName || content ? (
                <span className="text-xs text-muted">{content.length.toLocaleString()} chars</span>
              ) : null}
            </div>
          </div>
        )}

        {result ? (
          <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
            {result}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}