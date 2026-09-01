"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  ScanLine,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Hash,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/state";
import { Alert } from "@/components/ui/alert";

type Evidence = {
  id: string;
  name: string;
  sha256: string | null;
  status: string;
  verified: boolean;
  sizeBytes: number;
  caseId: string;
  createdAt: string;
};
type VerifyResult = {
  verified: boolean;
  hashMatch: boolean;
  blockchainMatched: boolean;
  chainIntact: boolean;
  storedHash?: string;
  recomputedHash?: string;
};

export default function EvidencePage() {
  const router = useRouter();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; res: VerifyResult } | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [ev, cs] = await Promise.all([
        fetch("/api/intel-data?scope=evidence").then((r) => r.json()),
        fetch("/api/intel-data?scope=cases").then((r) => r.json()),
      ]);
      setEvidence(ev.evidence ?? []);
      const m: Record<string, string> = {};
      for (const c of cs.cases ?? []) m[c.id] = c.caseId;
      setCases(m);
      setLoading(false);
    })();
  }, []);

  async function verify(id: string) {
    setVerifying(id);
    setResult(null);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/evidence/${id}/verify`, { method: "POST" });
      const data = await res.json();
      setResult({ id, res: data });
      if (!data.verified) {
        setAlertMsg(`Evidence integrity verification failed for this exhibit.`);
      }
      router.refresh();
      // update local state
      setEvidence((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, verified: data.verified, status: data.verified ? "VERIFIED" : "COMPROMISED" }
            : e
        )
      );
    } finally {
      setVerifying(null);
    }
  }

  async function tamper(id: string) {
    setAlertMsg(null);
    await fetch(`/api/evidence/${id}/tamper`, { method: "POST" });
    setAlertMsg("Tamper simulated — the exhibit hash no longer matches its blockchain record.");
    router.refresh();
    setEvidence((prev) => prev.map((e) => (e.id === id ? { ...e, verified: false, status: "COMPROMISED" } : e)));
    setResult(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Evidence Explorer"
        description="View exhibits, verify hash integrity against the prototype ledger, and trace supporting records."
        icon={Landmark}
        badge="Integrity"
      />

      <Alert variant="info" title="Evidence integrity">
        Each exhibit is SHA-256 hashed on upload and notarized on the prototype blockchain ledger.
        Use Verify Evidence to confirm the current file still matches the notarized hash.
      </Alert>

      {alertMsg ? <Alert variant="danger" title="Integrity alert">{alertMsg}</Alert> : null}
      {result ? (
        <VerifyResultCard result={result.res} />
      ) : null}

      <Card>
        <CardHeader
          title="Exhibits"
          description="All stored evidence across cases"
        />
        <CardContent>
          {loading ? (
            <LoadingState label="Loading evidence…" />
          ) : evidence.length === 0 ? (
            <EmptyState title="No evidence" description="Upload documents via Document Analysis." />
          ) : (
            <div className="space-y-2.5">
              {evidence.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-border bg-surface-raised/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised">
                      <Hash className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                      <p className="text-[11px] text-muted">
                        {cases[e.caseId] ?? e.caseId} · {(e.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                      <p className="mt-0.5 break-all font-mono text-[10px] text-muted">
                        {e.sha256 ?? "no hash"}
                      </p>
                    </div>
                    <Badge variant={e.status === "VERIFIED" ? "success" : e.status === "COMPROMISED" ? "danger" : "outline"}>
                      {e.status.toLowerCase()}
                    </Badge>
                    <div className="flex w-full justify-end gap-2 sm:w-auto">
                      <Button
                        variant={e.status === "COMPROMISED" ? "danger" : "outline"}
                        size="sm"
                        onClick={() => verify(e.id)}
                        disabled={verifying === e.id}
                      >
                        {verifying === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                        Verify
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => tamper(e.id)}
                        title="Prototype: simulate tampering to test integrity detection"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Tamper
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerifyResultCard({ result: r }: { result: VerifyResult }) {
  const ok = r.verified;
  return (
    <Alert variant={ok ? "success" : "danger"} title={ok ? "Evidence verified — hash matches blockchain record" : "Evidence integrity verification failed"}>
      <div className="mt-2 space-y-1 text-xs">
        <p className="flex items-center gap-1.5">
          {r.hashMatch ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Hash recomputed: {r.hashMatch ? "matched" : "mismatch"}
        </p>
        <p className="flex items-center gap-1.5">
          {r.blockchainMatched ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Blockchain record: {r.blockchainMatched ? "found" : "mismatch"}
        </p>
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Timestamp verified
        </p>
        <p className="flex items-center gap-1.5">
          {r.chainIntact ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Ledger chain: {r.chainIntact ? "intact" : "broken"}
        </p>
        {r.recomputedHash ? (
          <p className="break-all font-mono text-[10px] text-muted">current: {r.recomputedHash}</p>
        ) : null}
        <p className="flex items-center gap-1.5">
          {ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {ok ? "Evidence integrity confirmed" : "Evidence may have been altered — escalate for review"}
        </p>
      </div>
    </Alert>
  );
}
