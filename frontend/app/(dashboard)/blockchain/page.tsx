"use client";

import { useEffect, useState } from "react";
import { Link2, ShieldCheck, ShieldAlert, Loader2, Box, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/state";

type Block = {
  id: string;
  index: number;
  timestamp: string;
  dataHash: string;
  previousHash: string;
  hash: string;
  action: string;
  note?: string | null;
  evidenceName?: string | null;
};

const ACTION_COLOR: Record<string, string> = {
  GENESIS: "#8b9bb4",
  EVIDENCE_HASH: "#22c55e",
  INTEGRITY_VERIFY: "#60a5fa",
  EVIDENCE_MODIFIED: "#ef4444",
};

export default function BlockchainPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [chainResult, setChainResult] = useState<{
    intact: boolean;
    totalBlocks: number;
    brokenIndex: number | null;
  } | null>(null);

  async function load() {
    setLoading(true);
    const d = await fetch("/api/intel-data?scope=blockchain").then((r) => r.json());
    setBlocks(d.blocks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function verifyChain() {
    setChecking(true);
    const res = await fetch("/api/blockchain/verify-chain", { method: "POST" });
    const data = await res.json();
    setChainResult({
      intact: data.intact,
      totalBlocks: data.totalBlocks,
      brokenIndex: data.brokenIndex,
    });
    setChecking(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Prototype Blockchain Ledger"
        description="Simulated private ledger for evidence integrity. SHA-256 chained blocks — prototype only."
        icon={Link2}
        badge="Prototype"
        actions={
          <Button size="sm" onClick={verifyChain} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify chain
          </Button>
        }
      />

      {chainResult ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            {chainResult.intact ? (
              <>
                <ShieldCheck className="h-5 w-5 text-success" />
                <p className="text-sm text-foreground">Ledger chain is intact.</p>
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-danger" />
                <p className="text-sm text-foreground">
                  Ledger integrity FAILED at block {chainResult.brokenIndex ?? "?"}.
                </p>
              </>
            )}
            <Badge variant={chainResult.intact ? "success" : "danger"}>
              {chainResult.totalBlocks} blocks verified
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Alert integrity={false} />

      {loading ? (
        <Card>
          <LoadingState label="Loading ledger…" />
        </Card>
      ) : blocks.length === 0 ? (
        <Card>
          <EmptyState title="Ledger is empty" />
        </Card>
      ) : (
        <div className="relative space-y-3 pl-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {blocks.map((b) => {
            const isModified = b.action === "EVIDENCE_MODIFIED";
            const color = ACTION_COLOR[b.action] ?? "#8b9bb4";
            return (
              <div key={b.id} className="relative">
                <span
                  className="absolute -left-6 top-3 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface"
                  style={{ background: `${color}22`, color }}
                >
                  <Box className="h-3 w-3" />
                </span>
                <Card className={isModified ? "border-danger/40" : ""}>
                  <CardContent className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">#{b.index}</Badge>
                      <Badge variant={isModified ? "danger" : "default"}>{b.action}</Badge>
                      <span className="ml-auto font-mono text-[11px] text-muted">
                        {new Date(b.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {b.note ? <p className="text-xs text-muted">{b.note}</p> : null}
                    {b.evidenceName ? (
                      <p className="text-xs text-foreground/80">Evidence: {b.evidenceName}</p>
                    ) : null}
                    <div className="grid gap-1 font-mono text-[10px] text-muted">
                      <p className="break-all">prev: {b.previousHash.slice(0, 32)}…</p>
                      <p className="break-all">hash: {b.hash.slice(0, 32)}…</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Alert({ integrity }: { integrity: boolean }) {
  return integrity ? null : (
    <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p>
        This is a <strong>prototype blockchain ledger</strong> for demonstration of integrity
        verification only. It is not a real public chain and must not be relied upon for
        evidentiary certification in production.
      </p>
    </div>
  );
}
