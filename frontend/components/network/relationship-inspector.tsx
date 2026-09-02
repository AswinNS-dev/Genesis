"use client";

import Link from "next/link";
import { Link2, X, FolderKanban, ShieldAlert, FileText, ExternalLink, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { entityColor, entityLabel, relationColor, relationLabel } from "@backend/lib/colors";
import type { EdgeData } from "@backend/services/graph-analysis.service";

interface RelationshipInspectorProps {
  relationship: EdgeData | null;
  onClose: () => void;
}

export function RelationshipInspector({ relationship, onClose }: RelationshipInspectorProps) {
  if (!relationship) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4 shadow-card animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider">
            <Link2 className="h-3.5 w-3.5" /> Evidence-Backed Relationship
          </div>
          <h4 className="mt-1 text-sm font-bold text-foreground flex items-center gap-2">
            <span>{relationship.sourceName}</span>
            <span className="text-muted text-xs">↔</span>
            <span>{relationship.targetName}</span>
          </h4>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Relationship Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-surface-raised/40 p-2.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Relationship Type</span>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: relationColor(relationship.type) }}
            />
            <span className="font-semibold text-foreground">
              {relationship.label || relationLabel(relationship.type)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised/40 p-2.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Connection Strength</span>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-foreground">{relationship.strength}%</span>
            <span className="text-[10px] text-muted">({relationship.count} records)</span>
          </div>
        </div>
      </div>

      {/* Supporting Evidence & Case References */}
      <div className="space-y-2 text-xs">
        <span className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1">
          <FolderKanban className="h-3.5 w-3.5 text-muted" /> Supporting Case / Evidence Records
        </span>

        {relationship.records && relationship.records.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {relationship.records.map((rec, idx) => (
              <div key={idx} className="rounded border border-border/80 bg-surface-raised/30 p-2 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-accent">{rec}</span>
                  <Badge variant="outline" className="text-[9px]">
                    Verified Record
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded border border-border bg-surface-raised/20 p-2.5 text-xs text-muted">
            Direct investigative link established from intelligence docket.
          </div>
        )}
      </div>

      {/* Entity Dossier Links */}
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <Link
          href={`/entities/${relationship.source}`}
          className="flex items-center gap-1 text-accent hover:underline font-medium"
        >
          <span>{relationship.sourceName} Dossier</span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
        <Link
          href={`/entities/${relationship.target}`}
          className="flex items-center gap-1 text-accent hover:underline font-medium"
        >
          <span>{relationship.targetName} Dossier</span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
      </div>
    </div>
  );
}
