"use client";

import { useState } from "react";
import { UploadCloud, Loader2, ShieldCheck, Lock } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CaseOption = { id: string; caseId: string; title: string };

export function FileUploadPanel({
  cases,
  onUploaded,
}: {
  cases: CaseOption[];
  onUploaded?: () => void;
}) {
  const [caseId, setCaseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ fileName: string; hash: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Upload a document"
        description="Evidence report (PDF/TEXT) — hashed and notarized, with AI entity extraction for review."
        action={<Lock className="h-4 w-4 text-muted" />}
      />
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted">Target case</label>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">Select a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseId} — {c.title}
              </option>
            ))}
          </select>
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
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-center transition ${
            dragOver ? "border-accent bg-accent/5" : "border-border"
          }`}
        >
          <UploadCloud className="h-6 w-6 text-muted" />
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

        <Button className="w-full" disabled={!file || !caseId || uploading} onClick={handleUpload}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload & extract"}
        </Button>

        {result ? (
          <div className="space-y-2 rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-green-200">
              <ShieldCheck className="h-4 w-4" /> Document processed
            </p>
            <p className="text-xs text-green-200/70">{result.fileName}</p>
            <p className="break-all font-mono text-[11px] text-green-200/60">SHA-256: {result.hash}</p>
            <p className="text-xs text-green-200/70">
              {result.count} entity candidates extracted — review them in Documents.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}