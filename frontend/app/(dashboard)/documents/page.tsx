"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  UploadCloud,
  Loader2,
  Check,
  X,
  Pencil,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/state";
import { Alert } from "@/components/ui/alert";
import { entityColor, entityLabel } from "@/components/entities/entity-helpers";

type Case = { id: string; caseId: string; title: string };
type Candidate = {
  id: string;
  type: string;
  value: string;
  context?: string | null;
  status: string;
};
type Evidence = {
  id: string;
  name: string;
  sha256?: string | null;
  sizeBytes: number;
  caseId: string;
  createdAt: string;
};

export default function DocumentsPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseId, setCaseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ fileName: string; hash: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/intel-data?scope=documents");
    const data = await res.json();
    setCases(data.cases ?? []);
    setEvidence(data.evidence ?? []);
    setCandidates(data.candidates ?? []);
    if (data.cases?.length && !caseId) setCaseId(data.cases[0].id);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload() {
    if (!file || !caseId) return;
    setUploading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caseId", caseId);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult({
        fileName: data.document.name,
        hash: data.hash,
        count: data.candidateCount,
      });
      setFile(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function act(id: string, action: "confirm" | "reject") {
    await fetch(`/api/extraction/${id}/${action}`, { method: "POST" });
    router.refresh();
    load();
  }

  async function saveEdit(id: string) {
    const newVal = editMap[id];
    if (!newVal || !newVal.trim()) return;
    await fetch(`/api/extraction/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newVal }),
    });
    router.refresh();
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AI Document Analysis"
        description="Upload reports and let AI extract entities for investigator confirmation."
        icon={FileSearch}
        badge="Explained AI"
      />

      <Alert variant="info" title="How this works">
        Uploading a fictional report triggers automatic entity extraction. Every
        extraction is a <em>pending lead</em> — you must Confirm, Edit or Reject
        each one. Nothing is added to the knowledge graph without your approval.
        All data is fictional.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upload panel */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Upload evidence"
            description="Investigation report (PDF/TEXT)"
          />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Target case</label>
              {loading ? (
                <div className="h-9 animate-pulse rounded-lg bg-surface-raised" />
              ) : (
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseId} — {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <UploadCloud className="h-7 w-7 text-muted" />
              <p className="text-xs text-muted">
                Drag & drop or{" "}
                <label className="cursor-pointer text-accent">
                  browse
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </p>
              <p className="text-[11px] text-muted">PDF or TEXT · max 20MB</p>
            </div>

            {file ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised/50 px-3 py-2 text-sm">
                <span className="truncate text-foreground">{file.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <Button
              className="w-full"
              disabled={!file || !caseId || uploading}
              onClick={handleUpload}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {uploading ? "Analyzing…" : "Upload & extract"}
            </Button>

            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Lock className="h-3 w-3" /> File is hashed (SHA-256) and notarized on the prototype blockchain.
            </p>
          </CardContent>
        </Card>

        {/* Extraction results */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Extraction review"
            description="Pending extractions awaiting confirmation"
            action={
              candidates.filter((c) => c.status === "PENDING").length > 0 ? (
                <Badge variant="warning">
                  {candidates.filter((c) => c.status === "PENDING").length} pending
                </Badge>
              ) : null
            }
          />
          <CardContent>
            {result ? (
              <div className="mb-4 space-y-2 rounded-lg border border-success/30 bg-success/10 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-green-200">
                  <ShieldCheck className="h-4 w-4" /> Document processed
                </p>
                <p className="text-xs text-green-200/70">{result.fileName}</p>
                <p className="break-all font-mono text-[11px] text-green-200/60">
                  SHA-256: {result.hash}
                </p>
                <p className="text-xs text-green-200/70">
                  {result.count} entity candidates extracted — review below.
                </p>
              </div>
            ) : null}

            {loading ? (
              <LoadingState label="Loading documents…" />
            ) : candidates.length === 0 ? (
              <EmptyState
                title="No extraction candidates"
                description="Upload a document above to run AI entity extraction."
              />
            ) : (
              <div className="space-y-2.5">
                {candidates.map((c) => {
                  const color = entityColor(c.type);
                  const pending = c.status === "PENDING";
                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-3 ${
                        pending ? "border-border bg-surface-raised/40" : "border-border opacity-60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${color}22` }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        </span>
                        <Badge variant="outline" className="uppercase">{entityLabel(c.type)}</Badge>
                        <span className="text-sm font-medium text-foreground">{c.value}</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          {c.status === "PENDING" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditMap((m) => ({
                                    ...m,
                                    [c.id]: m[c.id] ?? c.value,
                                  }))
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400"
                                onClick={() => act(c.id, "reject")}
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                              <Button size="sm" onClick={() => act(c.id, "confirm")}>
                                <Check className="h-3.5 w-3.5" /> Confirm
                              </Button>
                            </>
                          ) : (
                            <Badge variant={c.status === "CONFIRMED" ? "success" : "danger"}>
                              {c.status.toLowerCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {editMap[c.id] !== undefined && c.status === "PENDING" ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={editMap[c.id]}
                            onChange={(e) =>
                              setEditMap((m) => ({ ...m, [c.id]: e.target.value }))
                            }
                            className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                          />
                          <Button size="sm" onClick={() => saveEdit(c.id)}>
                            <Check className="h-3.5 w-3.5" /> Save
                          </Button>
                        </div>
                      ) : null}
                      {c.context ? (
                        <p className="mt-1.5 line-clamp-2 text-[11px] text-muted">{c.context}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent evidence */}
      <Card>
        <CardHeader title="Uploaded evidence" description="Recent documents across cases" />
        <CardContent>
          {evidence.length === 0 ? (
            <EmptyState title="No uploads yet" />
          ) : (
            <div className="space-y-2">
              {evidence.map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <FileSearch className="h-4 w-4 text-muted" />
                  <span className="truncate text-foreground">{e.name}</span>
                  <span className="ml-auto hidden font-mono text-[11px] text-muted sm:inline">
                    {e.sha256?.slice(0, 12)}…
                  </span>
                  <Badge variant="success" className="shrink-0">
                    <ShieldCheck className="h-3 w-3" /> Hashed
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
