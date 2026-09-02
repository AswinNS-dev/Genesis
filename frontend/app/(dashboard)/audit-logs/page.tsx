"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ScrollText, ShieldCheck, ShieldAlert, Filter, X,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, Eye,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AuditLog = {
  id: string;
  action: string;
  detail: string | null;
  caseId: string | null;
  ip: string | null;
  status: string;
  createdAt: string;
  user: { name: string; email: string; role: string } | null;
};

type AuditData = {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
  actionTypes: string[];
  users: { id: string; name: string; role: string }[];
};

const ACTION_SEVERITY: Record<string, "danger" | "warning" | "info" | "success" | "default"> = {
  LOGIN: "success",
  LOGOUT: "info",
  REPORT_GENERATED: "info",
  DOSSIER_VIEWED: "info",
  ENTITY_MERGED: "warning",
  ALERT_RESOLVED: "success",
  EVIDENCE_MODIFIED: "warning",
  CASE_UPDATED: "warning",
};

function actionVariant(action: string, status: string): "danger" | "warning" | "info" | "success" | "default" {
  if (status === "FORBIDDEN" || status === "FAILED") return "danger";
  return ACTION_SEVERITY[action] ?? "default";
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (filterAction) params.set("action", filterAction);
      if (filterStatus) params.set("status", filterStatus);
      if (filterUser) params.set("userId", filterUser);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await fetch(`/api/audit?${params}`);
      if (res.status === 403) { setError("Access restricted to administrators."); return; }
      if (!res.ok) { setError("Failed to load audit data."); return; }
      setData(await res.json());
    } catch {
      setError("Network error loading audit data.");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterStatus, filterUser, filterFrom, filterTo]);

  useEffect(() => { load(page); }, [page, load]);

  async function openDetail(log: AuditLog) {
    setDetailLoading(true);
    setSelected(log);
    try {
      const res = await fetch(`/api/audit?id=${log.id}`);
      if (res.ok) {
        const d = await res.json();
        setSelected(d.log);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function applyFilters() { setPage(1); load(1); }
  function clearFilters() {
    setFilterAction(""); setFilterStatus(""); setFilterUser("");
    setFilterFrom(""); setFilterTo("");
    setPage(1);
    setTimeout(() => load(1), 0);
  }

  const hasFilters = filterAction || filterStatus || filterUser || filterFrom || filterTo;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Immutable action trail for all sensitive investigator and system operations."
        icon={ScrollText}
        badge="Immutable"
        badgeVariant="success"
        actions={
          <div className="flex items-center gap-2">
            {data ? <Badge variant="outline">{data.total} total events</Badge> : null}
            <Button size="sm" variant="outline" onClick={() => load(page)}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader title="Filters" action={<Filter className="h-4 w-4 text-muted" />} />
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">All actions</option>
              {data?.actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="FORBIDDEN">FORBIDDEN</option>
            </select>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">All users</option>
              {data?.users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="From date"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="To date"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={applyFilters}>Apply filters</Button>
            {hasFilters ? (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Log list */}
      <Card>
        <CardHeader
          title="Action Trail"
          description="Every sensitive operation is recorded and cannot be modified."
          action={
            data && data.pages > 1 ? (
              <div className="flex items-center gap-1 text-xs text-muted">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {page} / {data.pages}
                <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages || loading}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null
          }
        />
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-muted">{error}</p>
          ) : !data || data.logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No audit events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2.5 hover:bg-surface-raised/70 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                    {log.status === "SUCCESS" ? (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-danger" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      <span className="font-medium">{log.action}</span>
                      {log.detail ? <span className="text-muted"> — {log.detail}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {log.user?.name ?? "System"}
                      {log.user?.role ? ` (${log.user.role})` : ""}
                      {" · "}{new Date(log.createdAt).toLocaleString()}
                      {log.ip ? ` · ${log.ip}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={actionVariant(log.action, log.status)}>{log.status}</Badge>
                    <button
                      onClick={() => openDetail(log)}
                      className="rounded p-1 text-muted hover:text-foreground hover:bg-surface-raised"
                      title="View detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Audit Event</p>
                <p className="mt-0.5 font-mono text-xs text-muted">AUD-{selected.id.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded p-1 text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-3 px-5 py-4">
                <DetailRow label="Event ID" value={`AUD-${selected.id.slice(-8).toUpperCase()}`} />
                <DetailRow label="Actor" value={selected.user?.name ?? "System"} />
                <DetailRow label="Role" value={selected.user?.role ?? "—"} />
                <DetailRow label="Action" value={selected.action} />
                <DetailRow label="Status" value={selected.status} />
                <DetailRow label="Timestamp" value={new Date(selected.createdAt).toLocaleString()} />
                {selected.ip ? <DetailRow label="IP / Session" value={selected.ip} /> : null}
                {selected.caseId ? <DetailRow label="Case ref" value={selected.caseId} /> : null}
                {selected.detail ? (
                  <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Details</p>
                    <p className="mt-1 text-sm text-foreground">{selected.detail}</p>
                  </div>
                ) : null}
                <p className="pt-2 text-[10px] text-muted">
                  Audit records are append-only and cannot be modified or deleted.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
      <span className="shrink-0 text-xs font-medium text-muted">{label}</span>
      <span className="text-right text-xs text-foreground">{value}</span>
    </div>
  );
}
