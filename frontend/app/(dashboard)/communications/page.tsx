"use client";

import { useEffect, useState } from "react";
import { Phone, ArrowLeftRight } from "lucide-react";
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

export default function CommunicationsPage() {
  const [comms, setComms] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/intel-data?scope=communications");
      const data = await res.json();
      setComms(data.communications ?? []);
      setLoading(false);
    })();
  }, []);

  const total = comms.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Communication Analysis"
        description="Call relationships, contact frequency and communication clusters."
        icon={Phone}
        badge="Fictional records"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Communication records"
            description={`${comms.length} connections · ${total} total calls (fictional)`}
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
          <CardHeader title="Clusters" description="Individuals with frequent contact" />
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
                        <span className="shrink-0 text-muted">{c.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${(c.count / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                <p className="pt-2 text-[11px] text-muted">
                  Elevated call frequency between two parties is a potentially significant pattern — requires verification.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
