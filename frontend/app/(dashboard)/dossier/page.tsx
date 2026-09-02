"use client";

import { useState, useCallback } from "react";
import {
  BookUser, Search, Loader2, AlertCircle, ChevronDown, ChevronUp,
  ShieldCheck, Network, Clock, Brain, FileText, GitCompare, ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntitySummary = {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  aliases: string | null;
  case: { caseId: string; title: string } | null;
};

type ConnectedEntity = {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  relationshipType: string;
  direction: "inbound" | "outbound";
  strength: number;
  count: number;
};

type ResolutionMatch = {
  matchId: string;
  otherEntityId: string;
  otherEntityName: string;
  otherEntityType: string;
  confidence: number;
  status: string;
  reasons: string[];
  createdAt: string;
};

type TimelineEvent = { id: string; type: string; summary: string; detail: string | null; eventAt: string };
type Evidence = { id: string; name: string; description: string | null; sha256: string | null; verified: boolean; status: string; sizeBytes: number; createdAt: string; blockIndex: number | null; blockHash: string | null };
type Pattern = { id: string; type: string; title: string; summary: string; severity: string; relevance: number; reasons: string[]; createdAt: string };
type NerFinding = { id: string; type: string; value: string; context: string | null; status: string; confidence: number | null; resolutionDecision: string | null };
type AuditEntry = { id: string; action: string; detail: string | null; status: string; actor: string; role: string | null; ip: string | null; createdAt: string };

type Dossier = {
  entity: {
    id: string; name: string; type: string; value: string | null;
    riskScore: number; aliases: string[]; metadata: Record<string, unknown>;
    createdAt: string; updatedAt: string;
  };
  case: {
    id: string; caseId: string; title: string; status: string;
    classification: string; assignedInvestigator: string | null;
    incidentDate: string | null; jurisdiction: string | null; category: string | null;
  } | null;
  connectedEntities: ConnectedEntity[];
  resolutionMatches: ResolutionMatch[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
  patterns: Pattern[];
  nerFindings: NerFinding[];
  auditTrail: AuditEntry[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_VARIANT: Record<string, "info" | "warning" | "danger" | "success" | "default"> = {
  PERSON: "info",
  PHONE: "success",
  VEHICLE: "warning",
  LOCATION: "default",
  ORGANIZATION: "danger",
  BANK_ACCOUNT: "warning",
  TRANSACTION: "default",
};

const MATCH_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  CONFIRMED: "success",
  REJECTED: "danger",
  PENDING: "warning",
};

function riskVariant(score: number): "danger" | "warning" | "success" | "outline" {
  if (score >= 70) return "danger";
  if (score >= 40) return "warning";
  if (score > 0) return "success";
  return "outline";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DossierPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EntitySummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setDossier(null);
    setSearched(false);
    setError("");
    try {
      const res = await fetch(`/api/dossier?search=${encodeURIComponent(query.trim())}`);
      if (!res.ok) { setError("Search failed."); return; }
      const d = await res.json();
      setResults(d.entities ?? []);
      setSearched(true);
    } catch {
      setError("Network error during search.");
    } finally {
      setSearching(false);
    }
  }, [query]);

  async function openDossier(entityId: string) {
    setLoading(true);
    setDossier(null);
    setError("");
    try {
      const res = await fetch(`/api/dossier?entityId=${entityId}`);
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to load dossier."); return; }
      const d = await res.json();
      setDossier(d.dossier);
    } catch {
      setError("Network error loading dossier.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Entity Dossier"
        description="Full investigation profile for a person, organisation, vehicle, or identifier."
        icon={BookUser}
        badge="Live Data"
        badgeVariant="success"
      />

      {/* Search */}
      <Card>
        <CardHeader title="Search Entity" description="Search by name, alias, phone number, vehicle registration, or identifier." />
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="e.g. Ramu Kumar, 9876543210, MH12AB1234…"
                className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <Button onClick={search} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
          {error ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Search results */}
      {searched && !dossier ? (
        <Card>
          <CardHeader title="Search Results" description={`${results.length} entity/entities found`} />
          <CardContent>
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No entities found matching "{query}".</p>
            ) : (
              <div className="space-y-2">
                {results.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2.5 hover:bg-surface-raised/70 transition-colors cursor-pointer"
                    onClick={() => openDossier(e.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{e.name}</span>
                        <Badge variant={TYPE_VARIANT[e.type] ?? "default"}>{e.type}</Badge>
                        <Badge variant={riskVariant(e.riskScore)}>Risk {e.riskScore}</Badge>
                      </div>
                      {e.case ? (
                        <p className="text-xs text-muted">{e.case.caseId} — {e.case.title}</p>
                      ) : null}
                    </div>
                    <Button size="sm" variant="outline">View Dossier</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : null}

      {/* Dossier */}
      {dossier ? (
        <DossierView dossier={dossier} onBack={() => { setDossier(null); }} />
      ) : null}
    </div>
  );
}

// ─── Dossier View ─────────────────────────────────────────────────────────────

function DossierView({ dossier: d, onBack }: { dossier: Dossier; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={onBack}>← Back to search</Button>
        <p className="text-xs text-muted">
          DATA SOURCE: LIVE INVESTIGATION DATABASE · No determination of culpability is made.
        </p>
      </div>

      {/* Identity */}
      <DossierSection icon={BookUser} title="Identity">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoCell label="Primary name" value={d.entity.name} />
          <InfoCell label="Entity type" value={d.entity.type} />
          <InfoCell label="Entity ID" value={d.entity.id.slice(-12).toUpperCase()} />
          <InfoCell label="Risk score" value={String(d.entity.riskScore)} />
          {d.entity.value ? <InfoCell label="Identifier value" value={d.entity.value} /> : null}
          <InfoCell label="First recorded" value={new Date(d.entity.createdAt).toLocaleDateString()} />
        </div>
        {d.entity.aliases.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted mb-1.5">Known aliases</p>
            <div className="flex flex-wrap gap-1.5">
              {d.entity.aliases.map((a, i) => (
                <span key={i} className="rounded border border-border px-2 py-0.5 text-xs text-foreground">{a}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">No known aliases recorded.</p>
        )}
        {Object.keys(d.entity.metadata).length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(d.entity.metadata).map(([k, v]) =>
              v ? <InfoCell key={k} label={k} value={String(v)} /> : null
            )}
          </div>
        ) : null}
      </DossierSection>

      {/* Related case */}
      {d.case ? (
        <DossierSection icon={FileText} title="Related Investigation">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCell label="Case ID" value={d.case.caseId} />
            <InfoCell label="Title" value={d.case.title} />
            <InfoCell label="Status" value={d.case.status} />
            <InfoCell label="Classification" value={d.case.classification} />
            {d.case.assignedInvestigator ? <InfoCell label="Investigator" value={d.case.assignedInvestigator} /> : null}
            {d.case.jurisdiction ? <InfoCell label="Jurisdiction" value={d.case.jurisdiction} /> : null}
            {d.case.category ? <InfoCell label="Category" value={d.case.category} /> : null}
            {d.case.incidentDate ? <InfoCell label="Incident date" value={new Date(d.case.incidentDate).toLocaleDateString()} /> : null}
          </div>
        </DossierSection>
      ) : null}

      {/* Network intelligence */}
      <DossierSection icon={Network} title="Network Intelligence">
        {d.connectedEntities.length === 0 ? (
          <p className="text-sm text-muted">No network relationships recorded.</p>
        ) : (
          <div className="space-y-2">
            {d.connectedEntities.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <Badge variant={TYPE_VARIANT[c.type] ?? "default"}>{c.type}</Badge>
                    <Badge variant={riskVariant(c.riskScore)}>Risk {c.riskScore}</Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {c.direction === "outbound" ? "→" : "←"} {c.relationshipType.toLowerCase()} · strength {c.strength}% · {c.count} record(s)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DossierSection>

      {/* Entity resolution */}
      <DossierSection icon={GitCompare} title="Entity Resolution Findings">
        {d.resolutionMatches.length === 0 ? (
          <p className="text-sm text-muted">No entity resolution matches found.</p>
        ) : (
          <div className="space-y-3">
            {d.resolutionMatches.map((m) => (
              <div key={m.matchId} className="rounded border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{d.entity.name}</span>
                  <span className="text-muted">↕</span>
                  <span className="text-sm font-medium text-foreground">{m.otherEntityName}</span>
                  <Badge variant={MATCH_VARIANT[m.status] ?? "default"}>{m.status}</Badge>
                  <span className="ml-auto text-xs text-muted">Confidence: {m.confidence}%</span>
                </div>
                {m.reasons.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.reasons.map((r, i) => (
                      <span key={i} className="rounded bg-surface-raised px-2 py-0.5 text-[11px] text-muted">{r}</span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-1 text-xs text-muted">Recorded: {new Date(m.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </DossierSection>

      {/* Timeline */}
      <DossierSection icon={Clock} title="Timeline / Activity History">
        {d.timeline.length === 0 ? (
          <p className="text-sm text-muted">No timeline events recorded.</p>
        ) : (
          <div className="relative space-y-3 pl-4 before:absolute before:left-1.5 before:top-0 before:h-full before:w-px before:bg-border">
            {d.timeline.map((e) => (
              <div key={e.id} className="relative">
                <div className="absolute -left-[13px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                <p className="font-mono text-[11px] text-muted">{new Date(e.eventAt).toLocaleString()}</p>
                <p className="text-sm text-foreground">{e.summary}</p>
                {e.detail ? <p className="text-xs text-muted">{e.detail}</p> : null}
                <Badge variant="outline" className="mt-0.5">{e.type}</Badge>
              </div>
            ))}
          </div>
        )}
      </DossierSection>

      {/* AI Analysis */}
      <DossierSection icon={Brain} title="AI Analysis">
        {d.patterns.length === 0 && d.nerFindings.length === 0 ? (
          <p className="text-sm text-muted">No AI findings available for this entity.</p>
        ) : (
          <div className="space-y-4">
            {d.patterns.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Detected Patterns</p>
                <div className="space-y-2">
                  {d.patterns.map((p) => (
                    <div key={p.id} className="rounded border border-border p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={p.severity === "HIGH" ? "danger" : p.severity === "MEDIUM" ? "warning" : "info"}>
                          {p.severity}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{p.title}</span>
                        <span className="ml-auto text-[11px] text-muted">relevance {p.relevance}%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{p.summary}</p>
                      {p.reasons.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {p.reasons.map((r, i) => (
                            <span key={i} className="rounded bg-surface-raised px-2 py-0.5 text-[11px] text-muted">{r}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {d.nerFindings.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">NER / Extraction Findings</p>
                <div className="space-y-1.5">
                  {d.nerFindings.map((n) => (
                    <div key={n.id} className="flex items-start gap-2 rounded border border-border px-3 py-2">
                      <Badge variant="outline">{n.type}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{n.value}</p>
                        {n.context ? <p className="text-xs text-muted">{n.context}</p> : null}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {n.confidence != null ? (
                          <span className="text-[11px] text-muted">{Math.round(n.confidence * 100)}%</span>
                        ) : null}
                        <Badge variant={n.status === "CONFIRMED" ? "success" : n.status === "REJECTED" ? "danger" : "warning"}>
                          {n.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-[11px] text-muted">AI findings are investigative leads and require human verification.</p>
          </div>
        )}
      </DossierSection>

      {/* Evidence */}
      <DossierSection icon={ShieldCheck} title="Evidence">
        {d.evidence.length === 0 ? (
          <p className="text-sm text-muted">No evidence documents linked to this entity's case.</p>
        ) : (
          <div className="space-y-2">
            {d.evidence.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 rounded border border-border px-3 py-2">
                <ShieldCheck className={e.verified ? "h-4 w-4 text-success" : "h-4 w-4 text-muted"} />
                <span className="text-sm text-foreground">{e.name}</span>
                <Badge variant="outline">{e.status}</Badge>
                {e.blockIndex != null ? (
                  <Badge variant="info">Block #{e.blockIndex}</Badge>
                ) : null}
                <span className="ml-auto text-[11px] text-muted">
                  {e.verified ? "Verified" : "Unverified"}
                  {e.sha256 ? ` · SHA-256: ${e.sha256.slice(0, 12)}…` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </DossierSection>

      {/* Audit trail */}
      <DossierSection icon={ScrollText} title="Audit Trail">
        {d.auditTrail.length === 0 ? (
          <p className="text-sm text-muted">No audit events recorded for this entity's case.</p>
        ) : (
          <div className="space-y-2">
            {d.auditTrail.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.action}</span>
                    {a.detail ? <span className="text-muted"> — {a.detail}</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {a.actor}{a.role ? ` (${a.role})` : ""} · {new Date(a.createdAt).toLocaleString()}
                    {a.ip ? ` · ${a.ip}` : ""}
                  </p>
                </div>
                <Badge variant={a.status === "SUCCESS" ? "success" : "danger"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </DossierSection>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DossierSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {open ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-surface-raised/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
