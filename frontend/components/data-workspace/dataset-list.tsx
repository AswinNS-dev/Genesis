"use client";

import { useState } from "react";
import { ChevronDown, Database, Loader2, Link2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type DatasetInfo = {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  recordCount: number;
  createdAt: string;
  _count: { records: number };
  error?: string | null;
};

type DetailRecord = {
  id: string;
  rowIndex: number;
  raw: string | null;
  normalized: string | null;
  matchStatus: string;
  matchConfidence: number;
  matchReasons: string | null;
  matchCandidate: { id: string; name: string; type: string } | null;
  mergedEntity: { id: string; name: string; type: string } | null;
};

type DetailResponse = {
  dataset: { records: DetailRecord[] };
  summary: { total: number; unmatched: number; candidate: number; merged: number; skipped: number };
};

const STATUS_VARIANT: Record<string, "success" | "info" | "warning" | "danger" | "outline"> = {
  READY: "success",
  NORMALIZED: "info",
  MAPPED: "info",
  UPLOADED: "outline",
  ERROR: "danger",
};

export function DatasetList({ datasets, onIngested }: { datasets: DatasetInfo[]; onIngested?: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, DetailResponse | null>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchNote, setMatchNote] = useState<string | null>(null);

  async function toggle(ds: DatasetInfo) {
    if (openId === ds.id) {
      setOpenId(null);
      return;
    }
    setOpenId(ds.id);
    if (detail[ds.id]) return;
    setLoadingId(ds.id);
    try {
      const res = await fetch(`/api/datasets?id=${ds.id}`);
      const data = await res.json();
      setDetail((d) => ({ ...d, [ds.id]: data }));
    } finally {
      setLoadingId(null);
    }
  }

  async function runMatching(dsId: string) {
    setMatchingId(dsId);
    setMatchNote(null);
    try {
      const res = await fetch(`/api/datasets/${dsId}/match`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Matching failed");
      setMatchNote(`Scored ${data.scored} record${data.scored === 1 ? "" : "s"} — ${data.matched} potential match${data.matched === 1 ? "" : "es"} flagged for review`);
      const fresh = await fetch(`/api/datasets?id=${dsId}`).then((r) => r.json());
      setDetail((d) => ({ ...d, [dsId]: fresh }));
    } catch (e) {
      setMatchNote(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setMatchingId(null);
    }
  }

  async function refreshDetail(dsId: string) {
    const fresh = await fetch(`/api/datasets?id=${dsId}`).then((r) => r.json());
    setDetail((d) => ({ ...d, [dsId]: fresh }));
  }

  return (
    <div className="space-y-2">
      {datasets.length === 0 ? (
        <EmptyState title="No datasets yet" description="Datasets appear here once the pipeline ingests a source." />
      ) : (
        datasets.map((ds) => (
          <div key={ds.id} className="overflow-hidden rounded-lg border border-border bg-surface-raised/40">
            <button
              type="button"
              onClick={() => toggle(ds)}
              className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-raised"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised"
                onClick={(e) => {
                  e.stopPropagation();
                  onIngested?.();
                }}
              >
                <Database className="h-4 w-4 text-accent" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{ds.name}</span>
                <span className="block text-[10px] text-muted">
                  {ds.sourceType} · {ds._count.records} records · {new Date(ds.createdAt).toLocaleDateString()}
                </span>
              </span>
              {ds.error ? (
                <Badge variant="danger">{ds.status.toLowerCase()} — {ds.error}</Badge>
              ) : (
                <Badge variant={STATUS_VARIANT[ds.status] ?? "outline"}>{ds.status.toLowerCase()}</Badge>
              )}
              <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", openId === ds.id ? "rotate-180" : "")} />
            </button>

{openId === ds.id ? (
              <div className="border-t border-border p-3">
                {loadingId === ds.id ? (
                  <LoadingState label="Loading records…" />
                ) : detail[ds.id] ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => runMatching(ds.id)} disabled={matchingId === ds.id || ds.status !== "READY"}>
                        {matchingId === ds.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                        {matchingId === ds.id ? "Scoring…" : "Run entity matching"}
                      </Button>
                      <span className="text-[11px] text-muted">Potential matches never auto-merge — each requires investigator review.</span>
                    </div>
                    {matchNote ? (
                      <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">{matchNote}</div>
                    ) : null}
                    <RecordsTable detail={detail[ds.id] as DetailResponse} onReviewed={() => refreshDetail(ds.id)} />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function RecordsTable({ detail, onReviewed }: { detail: DetailResponse; onReviewed?: () => void }) {
  const summary = detail.summary;
  const rows = detail.dataset.records;
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function review(id: string, decision: "approve" | "reject") {
    setReviewingId(id);
    try {
      const res = await fetch(`/api/dataset-records/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      onReviewed?.();
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{summary.total} total</Badge>
        <Badge variant="success">{summary.merged} merged</Badge>
        <Badge variant="warning">{summary.candidate} candidates</Badge>
        <Badge variant="outline">{summary.unmatched} unmatched</Badge>
        <Badge variant="outline">{summary.skipped} skipped</Badge>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No records.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="grid gap-2 rounded-lg border border-border bg-surface-raised/40 p-3 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Raw · row {r.rowIndex}</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted">{pretty(r.raw)}</pre>
              </div>
              <div className="md:border-l md:border-border md:pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Normalized</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-foreground">{pretty(r.normalized)}</pre>
              </div>
              <div className="flex flex-col items-start gap-1 md:items-end">
                <BigStatus
                  status={r.matchStatus}
                  confidence={r.matchConfidence}
                  candidateName={r.matchCandidate?.name}
                  mergedName={r.mergedEntity?.name}
                />
                {r.matchStatus === "CANDIDATE" && r.matchCandidate ? (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {(r.matchReasons ? (JSON.parse(r.matchReasons) as string[]) : []).map((rs) => (
                        <span key={rs} className="rounded bg-border/40 px-1.5 py-0.5 text-[10px] text-muted">
                          {rs}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => review(r.id, "approve")} disabled={reviewingId === r.id}>
                        <Check className="h-3 w-3 text-success" /> Merge
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => review(r.id, "reject")} disabled={reviewingId === r.id}>
                        <X className="h-3 w-3 text-danger" /> Reject
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BigStatus({
  status,
  confidence,
  candidateName,
  mergedName,
}: {
  status: string;
  confidence: number;
  candidateName?: string | null;
  mergedName?: string | null;
}) {
  const variant =
    status === "MERGED" ? "success" : status === "CANDIDATE" ? "warning" : "outline";
  return (
    <>
      <Badge variant={variant}>
        {status.toLowerCase()}
        {confidence > 0 && status === "CANDIDATE" ? ` · ${confidence}%` : ""}
      </Badge>
      {candidateName && status === "CANDIDATE" ? (
        <span className="text-[11px] text-muted">candidate: {candidateName}</span>
      ) : null}
      {mergedName ? <span className="text-[11px] text-success">merged into: {mergedName}</span> : null}
    </>
  );
}

function pretty(json: string | null): string {
  if (!json) return "(empty)";
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}