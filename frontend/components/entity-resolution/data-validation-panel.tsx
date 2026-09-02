"use client";

import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Database, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ValidatedRecord } from "@backend/services/validation.service";

interface DataValidationPanelProps {
  records: ValidatedRecord[];
}

export function DataValidationPanel({ records }: DataValidationPanelProps) {
  if (!records || records.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        No police records loaded for validation inspection.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Police Record Preprocessing & Validation</h3>
          <p className="text-xs text-muted">
            Strict provenance preservation: Raw source values kept intact alongside standardized canonical records.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {records.length} Records Validated
        </Badge>
      </div>

      <div className="grid gap-3">
        {records.map((rec) => {
          const raw = rec.original;
          const norm = rec.normalized;

          return (
            <div
              key={rec.id}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent text-xs font-mono font-bold">
                    #{rec.id.substring(rec.id.length - 4)}
                  </span>
                  <span className="font-semibold text-sm text-foreground">{raw.name || "(Unnamed)"}</span>
                  <Badge variant={rec.isValid ? "success" : "danger"} className="text-[10px]">
                    {rec.isValid ? "Valid" : "Validation Error"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  <span className="font-mono text-[10px] text-muted truncate max-w-[200px]">
                    {rec.provenance.hash}
                  </span>
                  <span>· {rec.provenance.source}</span>
                </div>
              </div>

              {/* Side-by-Side: Raw vs Normalized */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                {/* Raw Source Data */}
                <div className="rounded-lg border border-border/60 bg-surface-raised/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted uppercase">
                    <Database className="h-3 w-3" />
                    <span>Raw Ingested Data</span>
                  </div>
                  <div className="space-y-1 text-muted">
                    <div><span className="text-foreground font-medium">Name:</span> {raw.name || "—"}</div>
                    <div><span className="text-foreground font-medium">Phone:</span> {raw.phone || "—"}</div>
                    <div><span className="text-foreground font-medium">DOB / Age:</span> {raw.dob || (raw.age ? `${raw.age} yrs` : "—")}</div>
                    <div><span className="text-foreground font-medium">Address:</span> {raw.address || "—"}</div>
                    <div><span className="text-foreground font-medium">Case / FIR:</span> {raw.firNo || raw.caseId || "—"}</div>
                  </div>
                </div>

                {/* Normalized Canonical Data */}
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent uppercase">
                    <ArrowRight className="h-3 w-3" />
                    <span>Normalized Canonical Form</span>
                  </div>
                  <div className="space-y-1 text-muted">
                    <div>
                      <span className="text-foreground font-medium">Name:</span>{" "}
                      <span className="font-semibold text-accent">{norm.name}</span>{" "}
                      <span className="text-[10px] font-mono text-muted">(Soundex: {norm.namePhoneticKey})</span>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">Phone:</span>{" "}
                      {norm.phone ? <span className="font-mono text-foreground">{norm.phone}</span> : <span className="text-danger">Invalid/None</span>}
                    </div>
                    <div>
                      <span className="text-foreground font-medium">DOB (Standard):</span>{" "}
                      {norm.dob ? `${norm.dob} (Year: ${norm.birthYear})` : "—"}
                    </div>
                    <div>
                      <span className="text-foreground font-medium">Address:</span> {norm.address || "—"}
                    </div>
                    <div>
                      <span className="text-foreground font-medium">Station / FIR:</span> {norm.policeStation || norm.firNo || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings & Errors */}
              {(rec.errors.length > 0 || rec.warnings.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {rec.errors.map((e, idx) => (
                    <span key={idx} className="flex items-center gap-1 rounded bg-danger/10 text-danger px-2 py-0.5 font-medium">
                      <XCircle className="h-3 w-3" /> {e}
                    </span>
                  ))}
                  {rec.warnings.map((w, idx) => (
                    <span key={idx} className="flex items-center gap-1 rounded bg-warning/10 text-warning px-2 py-0.5 font-medium">
                      <AlertTriangle className="h-3 w-3" /> {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
