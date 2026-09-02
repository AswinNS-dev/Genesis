"use client";

import { useState, useEffect } from "react";
import {
  Users2,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  Shield,
  Share2,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/state";
import { CandidateComparisonView } from "./candidate-comparison-view";
import { DataValidationPanel } from "./data-validation-panel";
import { IdentityGraphPanel } from "./identity-graph-panel";
import { DemoScenarioRunner } from "./demo-scenario-runner";
import type {
  ResolutionCandidatePair,
  ResolutionStatistics,
  ReviewStatus,
} from "@backend/services/entity-resolution.service";
import type { ValidatedRecord } from "@backend/services/validation.service";

const DASHBOARD_TABS = [
  { key: "candidates", label: "Candidate Comparison & Review", icon: GitCompare },
  { key: "graph", label: "Identity Graph", icon: Share2 },
  { key: "validation", label: "Data Validation & Normalization", icon: FileCheck },
  { key: "demo", label: "SIH Demo Scenario", icon: Play },
] as const;

type DashboardTabKey = (typeof DASHBOARD_TABS)[number]["key"];

export function EntityResolutionDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("candidates");
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<ResolutionCandidatePair[]>([]);
  const [validatedRecords, setValidatedRecords] = useState<ValidatedRecord[]>([]);
  const [statistics, setStatistics] = useState<ResolutionStatistics | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/entity-resolution/demo", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setValidatedRecords(data.validatedRecords || []);
        setStatistics(data.statistics || null);
        if (data.candidates && data.candidates.length > 0) {
          setSelectedCandidateId(data.candidates[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load resolution data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewSubmit = async (candidateId: string, decision: ReviewStatus, note?: string) => {
    try {
      const res = await fetch("/api/entity-resolution/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, decision, reviewNote: note }),
      });
      if (res.ok) {
        const result = await res.json();
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, ...result.candidate } : c))
        );
      }
    } catch (err) {
      console.error("Failed to submit review", err);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchSearch =
      searchQuery === "" ||
      c.recordA.normalized.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recordB.normalized.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchClassification =
      classificationFilter === "ALL" || c.classification === classificationFilter;

    const matchStatus =
      statusFilter === "ALL" || c.reviewStatus === statusFilter;

    return matchSearch && matchClassification && matchStatus;
  });

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || filteredCandidates[0] || null;

  if (loading && candidates.length === 0) {
    return <LoadingState label="Initializing Entity Resolution Engine & Normalizing Police Records..." />;
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats Overview */}
      {statistics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted">Records Analyzed</span>
            <div className="font-mono text-xl font-bold text-foreground">{statistics.recordsAnalyzed}</div>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-success">Probable Matches</span>
            <div className="font-mono text-xl font-bold text-success">{statistics.probableSameEntity}</div>
          </div>
          <div className="rounded-xl border border-info/30 bg-info/5 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-info">Possible Matches</span>
            <div className="font-mono text-xl font-bold text-info">{statistics.possibleSameEntity}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted">Possible Aliases</span>
            <div className="font-mono text-xl font-bold text-foreground">{statistics.possibleAliases}</div>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-warning">Associations / Proxies</span>
            <div className="font-mono text-xl font-bold text-warning">{statistics.possibleAssociations + statistics.possibleProxies}</div>
          </div>
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-danger">Identity Conflicts</span>
            <div className="font-mono text-xl font-bold text-danger">{statistics.identityConflicts}</div>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-accent">Pending Reviews</span>
            <div className="font-mono text-xl font-bold text-accent">{statistics.pendingReviews}</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {DASHBOARD_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-surface text-muted hover:bg-surface-raised hover:text-foreground border border-border"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.key === "candidates" && candidates.length > 0 && (
                <span className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-mono ${isActive ? "bg-black/20" : "bg-surface-raised"}`}>
                  {candidates.length}
                </span>
              )}
            </button>
          );
        })}

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="ml-auto text-xs"
        >
          <RotateCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Reset / Refresh
        </Button>
      </div>

      {/* TAB 1: Candidates & Review */}
      {activeTab === "candidates" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Candidate List & Filters */}
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Filter by name or candidate ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-raised pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Classifications</option>
                  <option value="PROBABLE SAME ENTITY">Probable Same Entity</option>
                  <option value="POSSIBLE SAME ENTITY">Possible Same Entity</option>
                  <option value="POSSIBLE ALIAS">Possible Alias</option>
                  <option value="POSSIBLE ASSOCIATION">Possible Association</option>
                  <option value="IDENTITY CONFLICT">Identity Conflict</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="CONFIRMED_SAME_ENTITY">Confirmed Same</option>
                  <option value="CONFIRMED_ALIAS">Confirmed Alias</option>
                  <option value="CONFIRMED_ASSOCIATION">Confirmed Assoc</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Candidate List Cards */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredCandidates.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-6 text-center text-xs text-muted">
                  No candidate matches found matching the filter criteria.
                </div>
              ) : (
                filteredCandidates.map((c) => {
                  const isSelected = selectedCandidate?.id === c.id;
                  const recA = c.recordA.normalized;
                  const recB = c.recordB.normalized;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCandidateId(c.id)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-sm ring-1 ring-accent/30"
                          : "border-border bg-surface hover:border-accent/30 hover:bg-surface-raised/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-foreground truncate">
                          {recA.name} ↔ {recB.name}
                        </span>
                        <span className="font-mono text-xs font-bold text-accent">
                          {c.confidence}%
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px]">
                          {c.classification}
                        </Badge>
                        <Badge
                          variant={c.reviewStatus === "PENDING_REVIEW" ? "warning" : "success"}
                          className="text-[9px]"
                        >
                          {c.reviewStatus.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (2 spans): Selected Candidate Comparison & Review */}
          <div className="lg:col-span-2">
            {selectedCandidate ? (
              <CandidateComparisonView
                candidate={selectedCandidate}
                onReviewSubmit={handleReviewSubmit}
              />
            ) : (
              <div className="rounded-xl border border-border bg-surface p-12 text-center text-sm text-muted">
                Select a candidate pair from the list to inspect multi-signal evidence.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Identity Graph */}
      {activeTab === "graph" && selectedCandidate && (
        <IdentityGraphPanel candidate={selectedCandidate} />
      )}

      {/* TAB 3: Data Validation & Normalization */}
      {activeTab === "validation" && (
        <DataValidationPanel records={validatedRecords} />
      )}

      {/* TAB 4: Section 23 Demo Scenario */}
      {activeTab === "demo" && (
        <div className="space-y-6">
          <DemoScenarioRunner onRunDemo={loadData} loading={loading} />
          {selectedCandidate && (
            <CandidateComparisonView
              candidate={selectedCandidate}
              onReviewSubmit={handleReviewSubmit}
            />
          )}
        </div>
      )}
    </div>
  );
}
