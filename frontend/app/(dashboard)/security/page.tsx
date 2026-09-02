import type { Metadata } from "next";
import { ShieldCheck, ShieldAlert, ShieldBan, LogIn, LockKeyhole } from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { SECURITY_POLICY } from "@backend/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ResolveAlertButton } from "@/components/security/resolve-alert-button";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const [openAlerts, failedLogins24h, recentAttempts] = await Promise.all([
    prisma.securityAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.loginAttempt.count({
      where: { success: false, attemptAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
    }),
    prisma.loginAttempt.findMany({
      take: 15,
      orderBy: { attemptAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const severityColor: Record<string, "danger" | "warning" | "info" | "default"> = {
    CRITICAL: "danger",
    HIGH: "danger",
    MEDIUM: "warning",
    LOW: "info",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Security & Threat Detection"
        description="Failed-login tracking, access flagging, and security alerts."
        icon={ShieldCheck}
        badge="Active"
        actions={
          <Badge variant={failedLogins24h > 0 ? "warning" : "success"}>
            {failedLogins24h} failed login(s) · 24h
          </Badge>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <MiniStat
          icon={ShieldAlert}
          label="Open alerts"
          value={String(openAlerts.length)}
          tint="text-danger"
        />
        <MiniStat
          icon={ShieldBan}
          label="Failed logins (24h)"
          value={String(failedLogins24h)}
          tint="text-warning"
        />
        <MiniStat
          icon={LogIn}
          label="Recent events"
          value={String(recentAttempts.length)}
          tint="text-sky-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Active Security Alerts"
            description="Auto-generated on suspicious activity"
          />
          <CardContent className="space-y-3">
            {openAlerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No active alerts. System is clear.
              </p>
            ) : (
              openAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised/50 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{a.message}</p>
                      <Badge variant={severityColor[a.severity] ?? "default"}>{a.severity}</Badge>
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
          <Card>
            <CardHeader
              title="Security policy"
              description="Enforced by the authentication layer"
              action={<LockKeyhole className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2">
              <PolicyRow label="Account lock threshold" value={`${SECURITY_POLICY.ACCOUNT_LOCK_THRESHOLD} failed attempts`} />
              <PolicyRow label="Lock duration" value={`${SECURITY_POLICY.ACCOUNT_LOCK_MINUTES} minutes`} />
              <PolicyRow label="Distributed brute-force alert" value={`≥ ${SECURITY_POLICY.BRUTE_FORCE_IP_THRESHOLD} failures from one IP in ${SECURITY_POLICY.BRUTE_FORCE_IP_WINDOW_MINUTES} min`} />
              <PolicyRow label="Session expiry" value={`${Math.round(SECURITY_POLICY.SESSION_MAX_AGE_SECONDS / 3600)} hours`} />
              <PolicyRow label="Account states" value="ACTIVE · DISABLED · LOCKED" />
              <PolicyRow label="Evidence integrity" value="SHA-256 + blockchain hashing, tamper alerts" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Login Attempts" description="Authentication events with status" />
            <CardContent className="space-y-2.5">
              {recentAttempts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No login attempts recorded.</p>
              ) : (
                recentAttempts.map((a) => (
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

function MiniStat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: string;
}) {
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
