"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";
import type {
  EntityTemporalAnomaly,
  AnomalySeverity,
  BaselineStatus,
} from "@backend/services/temporal.service";

interface TemporalAnomalyTableProps {
  anomalies: EntityTemporalAnomaly[];
  beforeMinutes: number;
  afterMinutes: number;
}

const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { label: string; badgeVariant: "danger" | "warning" | "info" | "default"; color: string; border: string; bg: string }
> = {
  CRITICAL: {
    label: "Critical Anomaly",
    badgeVariant: "danger",
    color: "#f43f5e",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
  },
  HIGH: {
    label: "High Anomaly",
    badgeVariant: "danger",
    color: "#f97316",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
  },
  MEDIUM: {
    label: "Moderate Anomaly",
    badgeVariant: "warning",
    color: "#eab308",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  LOW: {
    label: "Normal Activity",
    badgeVariant: "default",
    color: "#94a3b8",
    border: "border-slate-500/20",
    bg: "bg-slate-500/5",
  },
};

const BASELINE_STATUS_CONFIG: Record<
  BaselineStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  STATISTICALLY_SUPPORTED: {
    label: "Statistically Supported",
    icon: CheckCircle2,
    className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient Baseline Data",
    icon: AlertTriangle,
    className: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  LOW_VARIANCE: {
    label: "Uniform Historical Baseline",
    icon: Info,
    className: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  NO_HISTORICAL_ACTIVITY: {
    label: "No Prior History",
    icon: HelpCircle,
    className: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
};

export function TemporalAnomalyTable({
  anomalies,
  beforeMinutes,
  afterMinutes,
}: TemporalAnomalyTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return anomalies.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.entityName.toLowerCase().includes(q);
        const matchType = a.entityType.toLowerCase().includes(q);
        if (!matchName && !matchType) return false;
      }
      if (filterSeverity !== "ALL" && a.anomalyLevel !== filterSeverity) {
        return false;
      }
      if (filterStatus !== "ALL" && a.baselineStatus !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [anomalies, searchQuery, filterSeverity, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised/30 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search entity by name or type…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter entities by baseline status"
          className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ALL">All Baseline Statuses</option>
          <option value="STATISTICALLY_SUPPORTED">Statistically Supported</option>
          <option value="INSUFFICIENT_DATA">Insufficient Baseline Data</option>
          <option value="LOW_VARIANCE">Uniform Baseline</option>
          <option value="NO_HISTORICAL_ACTIVITY">No Prior History</option>
        </select>

        {/* Severity Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs text-muted mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
            <span>Severity:</span>
          </div>

          <button
            type="button"
            onClick={() => setFilterSeverity("ALL")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterSeverity === "ALL"
                ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                : "text-muted hover:bg-surface hover:text-foreground"
            )}
          >
            All ({anomalies.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSeverity("CRITICAL")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterSeverity === "CRITICAL"
                ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                : "text-muted hover:bg-surface hover:text-foreground"
            )}
          >
            Critical ({anomalies.filter((a) => a.anomalyLevel === "CRITICAL").length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSeverity("HIGH")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterSeverity === "HIGH"
                ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40"
                : "text-muted hover:bg-surface hover:text-foreground"
            )}
          >
            High ({anomalies.filter((a) => a.anomalyLevel === "HIGH").length})
          </button>

          <button
            type="button"
            onClick={() => setFilterSeverity("MEDIUM")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterSeverity === "MEDIUM"
                ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
                : "text-muted hover:bg-surface hover:text-foreground"
            )}
          >
            Moderate ({anomalies.filter((a) => a.anomalyLevel === "MEDIUM").length})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8">
          <EmptyState
            title="No entities match the selected criteria"
            description="Adjust search queries or severity filters to view entities."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, index) => {
            const isExpanded = expandedId === item.entityId;
            const sevConfig = SEVERITY_CONFIG[item.anomalyLevel];
            const statusConfig = BASELINE_STATUS_CONFIG[item.baselineStatus];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={item.entityId}
                className={cn(
                  "rounded-xl border bg-surface transition-all",
                  sevConfig.border,
                  isExpanded ? "ring-1 ring-accent/30 shadow-lg" : "hover:border-accent/30"
                )}
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Rank, Name, Type */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised font-mono text-xs font-bold text-muted">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/entities/${item.entityId}`}
                            className="font-semibold text-foreground hover:text-accent flex items-center gap-1"
                          >
                            {item.entityName}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.entityType}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                              statusConfig.className
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                          <span>· Total in Window: {item.totalWindowActivity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Score Breakdown */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {/* Before Stats */}
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-center">
                        <div className="text-[10px] font-semibold uppercase text-amber-400">
                          Before ({beforeMinutes}m)
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
                          {item.beforeActivityCount}{" "}
                          <span className="text-[11px] text-muted font-normal">
                            (Z: {item.beforeAnomalyScore})
                          </span>
                        </div>
                        <div className="text-[10px] text-muted">
                          avg {item.beforeBaselineMean}/win
                        </div>
                      </div>

                      {/* After Stats */}
                      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-center">
                        <div className="text-[10px] font-semibold uppercase text-purple-400">
                          After ({afterMinutes}m)
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
                          {item.afterActivityCount}{" "}
                          <span className="text-[11px] text-muted font-normal">
                            (Z: {item.afterAnomalyScore})
                          </span>
                        </div>
                        <div className="text-[10px] text-muted">
                          avg {item.afterBaselineMean}/win
                        </div>
                      </div>

                      {/* Overall Anomaly Score */}
                      <div
                        className={cn(
                          "rounded-xl border px-3.5 py-1.5 text-center",
                          sevConfig.border,
                          sevConfig.bg
                        )}
                      >
                        <div
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: sevConfig.color }}
                        >
                          {sevConfig.label}
                        </div>
                        <div
                          className="mt-0.5 font-mono text-base font-extrabold"
                          style={{ color: sevConfig.color }}
                        >
                          {item.overallTemporalScore.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand Details Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : item.entityId)
                      }
                      className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <span>Hide Details</span>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>View Evidence & Reasons</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Explanation & Evidence Panel */}
                {isExpanded ? (
                  <div className="border-t border-border bg-surface-raised/30 p-4 space-y-4">
                    {/* Reason Narrative */}
                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Investigative Signal Summary</span>
                      </div>
                      <p className="mt-1.5 text-xs text-foreground/90 leading-relaxed">
                        {item.reason}
                      </p>
                    </div>

                    {/* Statistical Details Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-muted text-[11px]">Before Baseline (μ ± σ)</p>
                        <p className="mt-1 font-mono font-medium text-foreground">
                          {item.beforeBaselineMean} ± {item.beforeBaselineStd}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-muted text-[11px]">After Baseline (μ ± σ)</p>
                        <p className="mt-1 font-mono font-medium text-foreground">
                          {item.afterBaselineMean} ± {item.afterBaselineStd}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-muted text-[11px]">Signal Confidence</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {item.confidence}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-muted text-[11px]">Baseline Methodology</p>
                        <p className="mt-1 text-muted text-[11px]">
                          Binned duration matching (Sec 6A-6D)
                        </p>
                      </div>
                    </div>

                    {/* Associated Window Evidence */}
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                        Observed Window Activities ({item.evidenceActivities.length})
                      </p>
                      {item.evidenceActivities.length === 0 ? (
                        <p className="text-xs text-muted italic">
                          No direct activities recorded inside the observation window (flagged based on historical anomaly correlation).
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {item.evidenceActivities.map((act) => {
                            const isBefore = act.minutesFromCrime < 0;
                            const absMins = Math.abs(act.minutesFromCrime);
                            const offset = `${Math.floor(absMins / 60)}h ${absMins % 60}m`;

                            return (
                              <div
                                key={act.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {act.type}
                                  </Badge>
                                  <span className="font-medium text-foreground">
                                    {act.summary}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                      isBefore
                                        ? "text-amber-400 bg-amber-500/10"
                                        : "text-purple-400 bg-purple-500/10"
                                    )}
                                  >
                                    {isBefore ? `-${offset}` : `+${offset}`}
                                  </span>
                                  <span className="text-muted">
                                    {new Date(act.eventAt).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
