"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Shield,
  FileText,
  Link2,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResolutionCandidatePair, ReviewStatus } from "@backend/services/entity-resolution.service";

interface CandidateComparisonViewProps {
  candidate: ResolutionCandidatePair;
  onReviewSubmit: (candidateId: string, decision: ReviewStatus, note?: string) => Promise<void>;
}

export function CandidateComparisonView({ candidate, onReviewSubmit }: CandidateComparisonViewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const recA = candidate.recordA.normalized;
  const recB = candidate.recordB.normalized;
  const sig = candidate.signals;

  const handleAction = async (decision: ReviewStatus) => {
    setSubmitting(true);
    try {
      await onReviewSubmit(candidate.id, decision, note);
      setShowNoteInput(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getClassificationBadgeVariant = (classification: string) => {
    switch (classification) {
      case "PROBABLE SAME ENTITY":
        return "success";
      case "POSSIBLE SAME ENTITY":
        return "info";
      case "POSSIBLE ALIAS":
        return "default";
      case "POSSIBLE ASSOCIATION":
      case "POSSIBLE PROXY":
        return "warning";
      case "IDENTITY CONFLICT":
        return "danger";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-6">
      {/* Header & Classification */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-muted">ID: {candidate.id}</span>
            <Badge variant={getClassificationBadgeVariant(candidate.classification)} className="text-xs font-semibold">
              {candidate.classification}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Status: {candidate.reviewStatus.replace(/_/g, " ")}
            </Badge>
          </div>
          <h2 className="mt-1 text-base font-bold text-foreground">
            {recA.name.toUpperCase()} ↔ {recB.name.toUpperCase()}
          </h2>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-bold text-muted uppercase">Confidence Level</div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-2xl font-extrabold text-accent">{candidate.confidence}%</div>
            <div className="h-2 w-20 rounded-full bg-surface-raised overflow-hidden">
              <div
                className={`h-full ${candidate.confidence >= 70 ? "bg-success" : candidate.confidence >= 50 ? "bg-warning" : "bg-danger"}`}
                style={{ width: `${candidate.confidence}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Record A */}
        <div className="rounded-xl border border-border bg-surface-raised/30 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20 text-blue-400 font-bold text-xs">
                A
              </span>
              <span className="font-bold text-sm text-foreground">{candidate.recordA.original.name || recA.name}</span>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              {candidate.recordA.provenance.source}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Standardized Name</span>
              <p className="font-medium text-foreground">{recA.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Phonetic Key</span>
              <p className="font-mono font-medium text-foreground">{recA.namePhoneticKey}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Phone Number</span>
              <p className="font-mono font-medium text-foreground">{recA.phone || "—"}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Date of Birth</span>
              <p className="font-mono font-medium text-foreground">{recA.dob || (recA.birthYear ? `Year ${recA.birthYear}` : "—")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-muted uppercase font-bold">Address</span>
              <p className="font-medium text-foreground">{recA.address || "—"} {recA.city ? `(${recA.city})` : ""}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-muted uppercase font-bold">Case / FIR Link</span>
              <p className="font-medium text-foreground">{recA.firNo || recA.caseId || "—"}</p>
            </div>
          </div>
        </div>

        {/* Record B */}
        <div className="rounded-xl border border-border bg-surface-raised/30 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-pink-500/20 text-pink-400 font-bold text-xs">
                B
              </span>
              <span className="font-bold text-sm text-foreground">{candidate.recordB.original.name || recB.name}</span>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              {candidate.recordB.provenance.source}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Standardized Name</span>
              <p className="font-medium text-foreground">{recB.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Phonetic Key</span>
              <p className="font-mono font-medium text-foreground">{recB.namePhoneticKey}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Phone Number</span>
              <p className="font-mono font-medium text-foreground">{recB.phone || "—"}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold">Date of Birth</span>
              <p className="font-mono font-medium text-foreground">{recB.dob || (recB.birthYear ? `Year ${recB.birthYear}` : "—")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-muted uppercase font-bold">Address</span>
              <p className="font-medium text-foreground">{recB.address || "—"} {recB.city ? `(${recB.city})` : ""}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-muted uppercase font-bold">Case / FIR Link</span>
              <p className="font-medium text-foreground">{recB.firNo || recB.caseId || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Signal Radar Scores */}
      <div className="rounded-xl border border-border bg-surface-raised/20 p-4 space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Multi-Signal Evidence Breakdown
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-surface p-2">
            <span className="text-[10px] text-muted font-semibold">Identity (25%)</span>
            <div className="text-sm font-mono font-bold text-foreground mt-0.5">{sig.nameScore}%</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2">
            <span className="text-[10px] text-muted font-semibold">Contact (20%)</span>
            <div className="text-sm font-mono font-bold text-foreground mt-0.5">{sig.contactScore}%</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2">
            <span className="text-[10px] text-muted font-semibold">Location (15%)</span>
            <div className="text-sm font-mono font-bold text-foreground mt-0.5">{sig.locationScore}%</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2">
            <span className="text-[10px] text-muted font-semibold">Vehicle (10%)</span>
            <div className="text-sm font-mono font-bold text-foreground mt-0.5">{sig.vehicleScore}%</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2">
            <span className="text-[10px] text-muted font-semibold">Case (15%)</span>
            <div className="text-sm font-mono font-bold text-foreground mt-0.5">{sig.caseScore}%</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2">
            <span className="text-[10px] text-danger font-semibold">Contradiction</span>
            <div className="text-sm font-mono font-bold text-danger mt-0.5">-{sig.contradictionPenalty}%</div>
          </div>
        </div>
      </div>

      {/* Supporting Evidence vs Counter-Evidence */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Supporting Evidence */}
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-success uppercase">
            <CheckCircle2 className="h-4 w-4" /> Supporting Evidence ({candidate.supportingEvidence.length})
          </div>
          {candidate.supportingEvidence.length === 0 ? (
            <p className="text-xs text-muted">No positive matching signals detected.</p>
          ) : (
            <div className="space-y-2">
              {candidate.supportingEvidence.map((e, idx) => (
                <div key={idx} className="rounded border border-success/20 bg-surface/60 p-2 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{e.title}</span>
                    <span className="font-mono text-[10px] font-bold text-success">{e.weightImpact}</span>
                  </div>
                  <p className="text-muted leading-relaxed">{e.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Counter Evidence & Contradictions */}
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-danger uppercase">
            <AlertTriangle className="h-4 w-4" /> Counter Evidence & Contradictions ({candidate.counterEvidence.length})
          </div>
          {candidate.counterEvidence.length === 0 ? (
            <p className="text-xs text-muted">No contradicting signals detected.</p>
          ) : (
            <div className="space-y-2">
              {candidate.counterEvidence.map((e, idx) => (
                <div key={idx} className="rounded border border-danger/20 bg-surface/60 p-2 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-danger">{e.title}</span>
                    <span className="font-mono text-[10px] font-bold text-danger">{e.weightImpact}</span>
                  </div>
                  <p className="text-muted leading-relaxed">{e.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Explainable Decision Narrative */}
      <div className="rounded-lg border border-border bg-surface-raised/30 p-3 text-xs text-muted leading-relaxed">
        <span className="font-bold text-foreground">Assessment Summary: </span>
        {candidate.explanation}
      </div>

      {/* Blockchain Ledger Provenance */}
      {candidate.blockchainTxHash && (
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2 text-xs text-muted">
          <Lock className="h-3.5 w-3.5 text-accent" />
          <span>Blockchain Notarization Block:</span>
          <span className="font-mono text-accent font-semibold">{candidate.blockchainTxHash}</span>
          <span className="text-[10px] text-muted ml-auto">Decision by {candidate.reviewedBy || "Investigator"}</span>
        </div>
      )}

      {/* Investigator Action Panel */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Investigator Decision Control
          </span>
          <button
            type="button"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="text-xs text-accent hover:underline"
          >
            {showNoteInput ? "Hide note" : "+ Add decision note"}
          </button>
        </div>

        {showNoteInput && (
          <input
            type="text"
            placeholder="Add justification note for audit log..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={submitting}
            onClick={() => handleAction("CONFIRMED_SAME_ENTITY")}
            className="bg-success text-white hover:bg-success/90"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm Same Entity
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => handleAction("CONFIRMED_ALIAS")}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" /> Mark as Alias
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => handleAction("CONFIRMED_ASSOCIATION")}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" /> Mark as Association
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => handleAction("INVESTIGATE_FURTHER")}
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1" /> Investigate Further
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => handleAction("REJECTED")}
            className="text-danger hover:bg-danger/10 ml-auto"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject Match
          </Button>
        </div>
      </div>
    </div>
  );
}
