"use client";

import { useEffect, useState } from "react";
import { Coins, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";

type Tx = {
  id: string;
  sender: string;
  receiver: string;
  count: number;
  strength: number;
  records: string[];
};

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/intel-data?scope=transactions");
      const data = await res.json();
      setTxs(data.transactions ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Financial / Transaction Analysis"
        description="Transaction relationships and connected financial chains (fictional data)."
        icon={Coins}
        badge="Finance trail"
      />

      {/* Demo transaction chain visualization */}
      <Card>
        <CardHeader title="Example transaction chain" description="Funds movement across entities (fictional)" />
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-4">
            <ChainNode label="Skyline Traders" tone="danger" />
            <ArrowRight className="h-4 w-4 text-danger" />
            <ChainNode label="Amit Sharma" tone="warning" />
            <ArrowRight className="h-4 w-4 text-danger" />
            <ChainNode label="Rahul Kumar" tone="warning" />
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted">
              <Badge variant="warning">Transaction chain detected</Badge>
              <Badge variant="outline">Requires verification</Badge>
            </span>
          </div>
          <p className="mt-3 text-xs text-muted">
            Financial transfers among these entities form a connected chain. This is an investigative
            lead — confirm each transaction against independent banking records.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Transaction relationships"
          description="Sender → receiver flows with record references"
        />
        <CardContent>
          {loading ? (
            <LoadingState label="Loading transaction data…" />
          ) : txs.length === 0 ? (
            <EmptyState title="No transaction records" />
          ) : (
            <div className="space-y-2">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                    <Coins className="h-4 w-4 text-danger" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {t.sender} <ArrowRight className="inline h-3 w-3 text-muted" /> {t.receiver}
                    </p>
                    <p className="text-[11px] text-muted">{t.records.join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{t.count}</p>
                    <p className="text-[11px] text-muted">transfers</p>
                  </div>
                  <Badge variant={t.strength >= 70 ? "warning" : "outline"}>{t.strength}%</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChainNode({ label, tone }: { label: string; tone: "danger" | "warning" }) {
  const color = tone === "danger" ? "#f87171" : "#fbbf24";
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: `${color}40`, background: `${color}12` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
