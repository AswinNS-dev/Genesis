"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Link2, Loader2, X } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/state";

type QueueRecord = {
  id: string;
  rowIndex: number;
  raw: string | null;
  matchStatus: string;
  matchConfidence: number;
  matchReasons: string | null;
  dataset: { id: string; name: string; sourceType: string };
  matchCandidate: { id: string; name: string; type: string } | null;
  mergedEntity: { id: string; name: string; type: string } | null;
};

export function ReviewQueue({ onChanged }: { onChanged?: () => void }) {
  const [records, setRecords] = useState<QueueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/dataset-records?status=CANDIDATE");
      const data = await res.json();
      setRecords(data.records ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id: string, decision: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch(`/api/dataset-records/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      await load();
      onChanged?.();
    } finally {
      setActing(null);
    }
  }

  function recordName(r: QueueRecord): string {
    try {
      const raw = JSON.parse(r.raw ?? "{}") as Record<string, string>;
      return raw.name ?? raw.line ?? "(unnamed)";
    } catch {
      return "(unnamed)";
    }
  }

  return (
    <Card>
      <CardHeader
        title="Match review queue"
        description="Potential matches across datasets awaiting an investigator decision"
        action={<Badge variant={records.length > 0 ? "warning" : "outline"}>{records.length} pending</Badge>}
      />
      <CardContent>
        {loading ? (
          <LoadingState label="Loading candidates…" />
        ) : records.length === 0 ? (
          <EmptyState title="Queue clear" description="No potential matches waiting for review." />
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised/40 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                  <Link2 className="h-4 w-4 text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {recordName(r)} <span className="text-muted">↔</span>{" "}
                    {r.matchCandidate ? (
                      <Link href={`/entities/${r.matchCandidate.id}`} className="font-medium text-accent hover:underline">
                        {r.matchCandidate.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {r.dataset.name} · row {r.rowIndex}
                  </p>
                  {r.matchReasons ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(JSON.parse(r.matchReasons) as string[]).map((rs) => (
                        <span key={rs} className="rounded bg-border/40 px-1.5 py-0.5 text-[10px] text-muted">
                          {rs}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Badge variant="warning">{r.matchConfidence}%</Badge>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => review(r.id, "approve")} disabled={acting === r.id}>
                    {acting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-success" />}
                    Merge
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => review(r.id, "reject")} disabled={acting === r.id}>
                    <X className="h-3 w-3 text-danger" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}