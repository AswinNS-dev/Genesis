"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Table as TableIcon,
  CalendarDays,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";
import { TemporalTimeline } from "./temporal-timeline";
import { TemporalAnomalyTable } from "./temporal-anomaly-table";
import { cn } from "@/lib/utils";
import type { TemporalDetectionResult } from "@backend/services/temporal.service";

interface CaseOption {
  id: string;
  caseId: string;
  title: string;
  incidentDate?: string | null;
  createdAt?: string;
  status: string;
}

interface TemporalDetectionProps {
  initialCaseId?: string;
}

const WINDOW_PRESETS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
  { label: "24 hours", value: 1440 },
];

export function TemporalDetection({ initialCaseId }: TemporalDetectionProps) {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId ?? "");
  const [customTimestamp, setCustomTimestamp] = useState<string>("");

  // Window configurations
  const [beforeMinutes, setBeforeMinutes] = useState<number>(120);
  const [afterMinutes, setAfterMinutes] = useState<number>(120);
  const [baselineDays, setBaselineDays] = useState<number>(30);

  // Results & Execution state
  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [runningDetection, setRunningDetection] = useState<boolean>(false);
  const [result, setResult] = useState<TemporalDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [viewTab, setViewTab] = useState<"anomalies" | "timeline" | "summary">("anomalies");

  // 1. Load Cases on mount
  useEffect(() => {
    async function loadCases() {
      try {
        const res = await fetch("/api/intel-data?scope=cases");
        const data = await res.json();
        const caseList: CaseOption[] = data.cases ?? [];
        setCases(caseList);

        if (!selectedCaseId && caseList.length > 0) {
          const first = caseList[0];
          setSelectedCaseId(first.id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load cases.");
      } finally {
        setLoadingCases(false);
      }
    }
    loadCases();
  }, [selectedCaseId]);

  // 2. Auto-run detection when selected case changes
  useEffect(() => {
    if (selectedCaseId && !loadingCases) {
      runDetection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  async function runDetection() {
    if (!selectedCaseId) return;
    setRunningDetection(true);
    setError(null);

    try {
      const res = await fetch("/api/analysis/temporal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          crimeTimestamp: customTimestamp || undefined,
          beforeWindowMinutes: beforeMinutes,
          afterWindowMinutes: afterMinutes,
          baselineDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Temporal detection failed.");
      }

      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Temporal detection failed.");
    } finally {
      setRunningDetection(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Crime & Window Configuration Panel */}
      <Card>
        <CardHeader
          title="Temporal Anomaly Configuration"
          description="Select a crime and configure the temporal observation window around its reference timestamp."
          action={
            result ? (
              <Badge variant="outline" className="font-mono text-xs">
                Ref: {new Date(result.crime.referenceTimestamp).toLocaleString()}
              </Badge>
            ) : null
          }
        />
        <CardContent className="space-y-4">
          {/* Top Selection Row: Case & Reference Timestamp */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Case Selector */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Select Crime / Case
              </label>
              {loadingCases ? (
                <div className="h-9 rounded-lg border border-border bg-surface px-3 flex items-center text-xs text-muted">
                  Loading cases…
                </div>
              ) : (
                <select
                  value={selectedCaseId}
                  onChange={(e) => {
                    setSelectedCaseId(e.target.value);
                    setCustomTimestamp("");
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select an investigation case…</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseId} — {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Reference Timestamp Input (Optional custom override) */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 flex items-center justify-between">
                <span>Crime Reference Timestamp</span>
                <span className="text-[10px] text-muted">(Auto from Case)</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  placeholder="Custom reference time"
                  value={customTimestamp}
                  onChange={(e) => setCustomTimestamp(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            {/* Baseline Lookback Period */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Historical Baseline Lookback
              </label>
              <select
                value={baselineDays}
                onChange={(e) => setBaselineDays(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value={7}>Prior 7 days</option>
                <option value={14}>Prior 14 days</option>
                <option value={30}>Prior 30 days (Recommended)</option>
                <option value={60}>Prior 60 days</option>
                <option value={90}>Prior 90 days</option>
              </select>
            </div>
          </div>

          {/* Window Sliders & Presets */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border/80 bg-surface-raised/20 p-4">
            {/* Before Window */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Before Crime Window
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {beforeMinutes >= 60
                    ? `${(beforeMinutes / 60).toFixed(beforeMinutes % 60 === 0 ? 0 : 1)} hrs`
                    : `${beforeMinutes} mins`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {WINDOW_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setBeforeMinutes(p.value)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                      beforeMinutes === p.value
                        ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
                        : "border border-border/60 text-muted hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* After Window */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
                  After Crime Window
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {afterMinutes >= 60
                    ? `${(afterMinutes / 60).toFixed(afterMinutes % 60 === 0 ? 0 : 1)} hrs`
                    : `${afterMinutes} mins`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {WINDOW_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAfterMinutes(p.value)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                      afterMinutes === p.value
                        ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40"
                        : "border border-border/60 text-muted hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
              <span>
                Calculates separate Before ({beforeMinutes}m) & After ({afterMinutes}m) binned baselines using exact population standard deviation.
              </span>
            </div>

            <Button
              onClick={runDetection}
              disabled={runningDetection || !selectedCaseId}
              className="px-5 font-semibold"
            >
              {runningDetection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 text-amber-300" />
              )}
              {runningDetection ? "Analyzing Temporal Signals…" : "Run Temporal Detection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200">Temporal Detection Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Loading State */}
      {runningDetection && !result ? (
        <LoadingState label="Executing temporal anomaly baseline comparisons…" />
      ) : null}

      {/* Results Workspace */}
      {result ? (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-accent">
                {result.statistics.totalWindowActivities}
              </p>
              <p className="mt-1 text-xs text-muted">Activities in Window</p>
              <div className="mt-1 text-[11px] text-muted">
                {result.statistics.beforeActivitiesCount} before · {result.statistics.afterActivitiesCount} after
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-rose-400">
                {result.statistics.anomalousEntitiesCount}
              </p>
              <p className="mt-1 text-xs text-muted">Anomalous Entities</p>
              <div className="mt-1 text-[11px] text-muted">
                Critical / High Activity Spikes
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-amber-400">
                {result.statistics.evaluatedEntitiesCount}
              </p>
              <p className="mt-1 text-xs text-muted">Evaluated Entities</p>
              <div className="mt-1 text-[11px] text-muted">
                With Baseline Historical Data
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-mono font-bold text-foreground truncate">
                {new Date(result.crime.referenceTimestamp).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-muted">Reference Date</p>
              <div className="mt-1 text-[11px] text-muted font-mono">
                {new Date(result.crime.referenceTimestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewTab("anomalies")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
                  viewTab === "anomalies"
                    ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface-raised hover:text-foreground"
                )}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Ranked Anomalies ({result.anomalies.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewTab("timeline")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
                  viewTab === "timeline"
                    ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface-raised hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Chronological Timeline ({result.timeline.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewTab("summary")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
                  viewTab === "summary"
                    ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface-raised hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Investigative Summary</span>
              </button>
            </div>

            <div className="text-[11px] text-muted italic">
              All signals are investigative leads for human review.
            </div>
          </div>

          {/* Tab 1: Ranked Anomalies */}
          {viewTab === "anomalies" ? (
            <TemporalAnomalyTable
              anomalies={result.anomalies}
              beforeMinutes={result.window.beforeMinutes}
              afterMinutes={result.window.afterMinutes}
            />
          ) : null}

          {/* Tab 2: Chronological Timeline */}
          {viewTab === "timeline" ? (
            <TemporalTimeline
              timeline={result.timeline}
              unassignedActivities={result.unassignedActivities}
              crimeTimestamp={result.crime.referenceTimestamp}
              crimeTitle={result.crime.title}
              crimeCaseId={result.crime.caseId}
            />
          ) : null}

          {/* Tab 3: Investigative Summary & Action Items */}
          {viewTab === "summary" ? (
            <Card>
              <CardHeader
                title="Temporal Analysis Report"
                description={`Investigation summary for ${result.crime.caseId}`}
              />
              <CardContent className="space-y-5">
                {/* Overview */}
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wide">
                    Executive Overview
                  </p>
                  <p className="mt-1.5 text-sm text-foreground leading-relaxed">
                    {result.summary.overview}
                  </p>
                </div>

                {/* High Risk Signals */}
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                    Key Activity Signals
                  </p>
                  <ul className="space-y-1.5">
                    {result.summary.highRiskSignals.map((sig, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised/30 p-2.5 text-xs text-foreground/90"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Investigative Next Steps */}
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                    Recommended Verification Steps
                  </p>
                  <ol className="space-y-1.5">
                    {result.summary.investigativeNextSteps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised/30 p-2.5 text-xs text-foreground/90"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Ethical Disclaimer */}
                <div className="rounded-lg border border-border bg-surface-raised/40 p-3 text-[11px] text-muted leading-relaxed">
                  {result.summary.disclaimer}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        !runningDetection && (
          <Card>
            <EmptyState
              title="No Temporal Detection Run Yet"
              description="Select a case and click 'Run Temporal Detection' above to evaluate activity anomalies."
            />
          </Card>
        )
      )}
    </div>
  );
}
