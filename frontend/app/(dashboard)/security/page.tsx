"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldBan, LogIn, LockKeyhole,
  RefreshCw, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResolveAlertButton } from "@/components/security/resolve-alert-button";

type SecurityAlert = {
  id: string;
  severity: string;
  type: string;
  message: string;
  detail: string | null;
  createdAt: string;
  resolved: boolean;
  user: { name: string; email: string } | null;
};

type LoginAttempt = {
  id: string;
  email: string;
  success: boolean;
  ip: string | null;
  reason: string | null;
  attemptAt: string;
  user: { name: string } | null;
};

type Stats = {
  openAlerts: number;
  failedLogins24h: number;
  successLogins24h: number;
  reportEvents7d: number;
  dossierEvents7d: number;
  entityDecisions7d: number;
  unauthorizedEvents7d: number;
  dataModifications7d: number;
  integrityAlerts: number;
};

type SecurityData = {
  stats: Stats;
  alerts: SecurityAlert[];
  alertPages: number;
  alertPage: number;
  attempts: LoginAttempt[];
  attemptPages: number;
  loginPage: number;
};

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "default"> = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "info",
};

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertPage, setAlertPage] = useState(1);
  const [loginPage, setLoginPage] = useState(1);

  const load = useCallback(async (ap = alertPage, lp = loginPage) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/security/stats?alertPage=${ap}&loginPage=${lp}`);
      if (res.status === 403) { setError("Access restricted to administrators."); return; }
      if (!res.ok) { setError("Failed to load security data."); return; }
      setData(await res.json());
    } catch {
      setError("Network error loading security data.");
    } finally {
      setLoading(false);
    }
  }, [alertPage, loginPage]);

  useEffect(() => { load(alertPage, loginPage); }, [alertPage, loginPage, load]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );

  if (error) return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Security & Threat Detection" icon={ShieldCheck} badge="Active" />
      <Card><CardContent className="py-12 text-center text-sm text-muted">{error}</CardContent></Card>
    </div>
  );

  const s = data!.stats;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Security & Threat Detection"
        description="Failed-login tracking, access flagging, and security alerts."
        icon={ShieldCheck}
        badge="Active"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={s.failedLogins24h > 0 ? "warning" : "success"}>
              {s.failedLogins24h} failed login(s) · 24h
            </Badge>
            <Button size="sm" variant="outline" onClick={() => load(alertPage, loginPage)}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MiniStat icon={ShieldAlert} label="Open alerts" value={String(s.openAlerts)} tint="text-danger" />
        <MiniStat icon={ShieldBan} label="Failed logins (24h)" value={String(s.failedLogins24h)} tint="text-warning" />
        <MiniStat icon={LogIn} label="Successful logins (24h)" value={String(s.successLogins24h)} tint="text-success" />
        <MiniStat icon={ShieldAlert} label="Unauthorized attempts (7d)" value={String(s.unauthorizedEvents7d)} tint="text-danger" />
        <MiniStat icon={ShieldCheck} label="Reports generated (7d)" value={String(s.reportEvents7d)} tint="text-sky-400" />
        <MiniStat icon={ShieldCheck} label="Dossier accesses (7d)" value={String(s.dossierEvents7d)} tint="text-sky-400" />
        <MiniStat icon={ShieldCheck} label="Entity decisions (7d)" value={String(s.entityDecisions7d)} tint="text-accent" />
        <MiniStat icon={ShieldAlert} label="Integrity alerts" value={String(s.integrityAlerts)} tint="text-warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active alerts */}
        <Card>
          <CardHeader
            title="Active Security Alerts"
            description="Auto-generated on suspicious activity"
            action={
              data!.alertPages > 1 ? (
                <div className="flex items-center gap-1 text-xs text-muted">
                  <button onClick={() => setAlertPage((p) => Math.max(1, p - 1))} disabled={alertPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {alertPage}/{data!.alertPages}
                  <button onClick={() => setAlertPage((p) => Math.min(data!.alertPages, p + 1))} disabled={alertPage === data!.alertPages}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null
            }
          />
          <CardContent className="space-y-3">
            {data!.alerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No active alerts. System is clear.</p>
            ) : (
              data!.alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised/50 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{a.message}</p>
                      <Badge variant={SEVERITY_VARIANT[a.severity] ?? "default"}>{a.severity}</Badge>
                    </div>
                    {a.detail ? <p className="mt-0.5 text-xs text-muted">{a.detail}</p> : null}
                    <p className="mt-1 text-xs text-muted">
                      {a.user?.name ?? "System"} · {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ResolveAlertButton id={a.id} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Security policy */}
          <Card>
            <CardHeader
              title="Security Policy"
              description="Enforced by the authentication layer"
              action={<LockKeyhole className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2">
              <PolicyRow label="Account lock threshold" value="5 failed attempts" />
              <PolicyRow label="Lock duration" value="15 minutes" />
              <PolicyRow label="Session expiry" value="24 hours" />
              <PolicyRow label="Evidence integrity" value="SHA-256 + blockchain hashing, tamper alerts" />
              <PolicyRow label="Audit immutability" value="Append-only audit log, no deletion" />
              <PolicyRow label="Role hierarchy" value="VIEWER → ANALYST → INVESTIGATOR → ADMIN" />
            </CardContent>
          </Card>

          {/* Login attempts */}
          <Card>
            <CardHeader
              title="Login Attempts"
              description="Authentication events with status"
              action={
                data!.attemptPages > 1 ? (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <button onClick={() => setLoginPage((p) => Math.max(1, p - 1))} disabled={loginPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {loginPage}/{data!.attemptPages}
                    <button onClick={() => setLoginPage((p) => Math.min(data!.attemptPages, p + 1))} disabled={loginPage === data!.attemptPages}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null
              }
            />
            <CardContent className="space-y-2.5">
              {data!.attempts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No login attempts recorded.</p>
              ) : (
                data!.attempts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{a.user?.name ?? a.email}</p>
                      <p className="text-xs text-muted">
                        {new Date(a.attemptAt).toLocaleString()} · {a.ip ?? "unknown IP"}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </p>
                    </div>
                    <Badge variant={a.success ? "success" : "danger"}>
                      {a.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-right text-[11px] text-muted">{value}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised">
          <Icon className={`h-5 w-5 ${tint}`} />
        </div>
        <div>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
