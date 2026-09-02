"use client";

import { useEffect, useState } from "react";
import { Phone, ArrowLeftRight, AlertTriangle, Users, Activity } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";

type Comm = {
  id: string;
  caller: string;
  receiver: string;
  count: number;
  strength: number;
  records: string[];
};

type CommAnalysis = {
  overall_summary?: {
    total_records: number;
    total_calls: number;
    unique_entities: number;
    total_anomalies: number;
  };
  anomalies?: {
    type: string;
    entity: string;
    targetEntity?: string;
    severity: string;
    score: number;
    reason: string;
  }[];
};

export default function CommunicationsPage() {
  const [comms, setComms] = useState<Comm[]>([]);
  const [analysis, setAnalysis] = useState<CommAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [intelRes, analysisRes] = await Promise.all([
          fetch("/api/intel-data?scope=communications"),
          fetch("/api/analysis/communications"),
        ]);
        const intelData = await intelRes.json();
        const analysisData = await analysisRes.json();
        setComms(intelData.communications ?? []);
        setAnalysis(analysisData);
      } catch {
        // graceful fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = comms.reduce((s, c) => s + c.count, 0);
  const uniqueEntities = new Set(comms.flatMap((c) => [c.caller, c.receiver])).size;
  const anomalies = analysis?.anomalies ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Communication Analysis"
        description="Call relationships, contact frequency profiling, and statistical spike detection."
        icon={Phone}
        badge="Analytics Engine"
      />

      {/* Metric Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Total Communications</p>
              <p className="text-xl font-bold text-foreground">{total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Unique Contacts</p>
              <p className="text-xl font-bold text-foreground">{uniqueEntities}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Active Relationships</p>
              <p className="text-xl font-bold text-foreground">{comms.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Detected Anomalies</p>
              <p className="text-xl font-bold text-foreground">{anomalies.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detected Anomalies Alert Box */}
      {anomalies.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader
            title="Communication Anomalies & Behavioral Shifts"
            description="Statistical spikes and newly detected communication relationships"
          />
          <CardContent className="space-y-2">
            {anomalies.map((a, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-warning/20 bg-surface/80 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {a.entity} {a.targetEntity ? `↔ ${a.targetEntity}` : ""}
                    </p>
                    <Badge variant={a.severity === "high" ? "danger" : "warning"}>
                      {a.type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{a.reason}</p>
                </div>
                <span className="text-xs font-mono font-medium text-muted">Score: {a.score}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Communication records"
            description={`${comms.length} connections · ${total} total calls`}
          />
          <CardContent>
            {loading ? (
              <LoadingState label="Loading communication data…" />
            ) : comms.length === 0 ? (
              <EmptyState title="No communication records" />
            ) : (
              <div className="space-y-2">
                {comms.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                      <Phone className="h-4 w-4 text-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {c.caller} <ArrowLeftRight className="inline h-3 w-3 text-muted" /> {c.receiver}
                      </p>
                      <p className="text-[11px] text-muted">
                        {c.count} call{c.count > 1 ? "s" : ""} · {c.records.join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{c.count}</p>
                      <p className="text-[11px] text-muted">calls</p>
                    </div>
                    <Badge variant={c.strength >= 75 ? "warning" : "outline"}>{c.strength}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Clusters & Top Contacts" description="Entities with frequent communication" />
          <CardContent>
            {comms.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <div className="space-y-3">
                {[...comms]
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 6)
                  .map((c) => (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-foreground">{c.caller} ↔ {c.receiver}</span>
                        <span className="shrink-0 text-muted">{c.count} calls</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${(c.count / Math.max(1, total)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                <p className="pt-2 text-[11px] text-muted">
                  Elevated call frequency between two parties is a potentially significant pattern for investigator review.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
