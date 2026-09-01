import type { Metadata } from "next";
import { ScrollText, ShieldCheck, ShieldAlert } from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Audit Logs" };
export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, role: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Comprehensive action recording for sensitive operations."
        icon={ScrollText}
        badge="Partial"
        actions={<Badge variant="outline">{logs.length} recent</Badge>}
      />

      <Card>
        <CardHeader
          title="Action Trail"
          description="Login and access events (extended in Phase 8)"
        />
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No audit events recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                    {log.status === "SUCCESS" ? (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-danger" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {log.action}
                      {log.detail ? <span className="text-muted"> — {log.detail}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {log.user?.name ?? "System"} · {new Date(log.createdAt).toLocaleString()} ·{" "}
                      {log.ip ?? "unknown IP"}
                    </p>
                  </div>
                  <Badge variant={log.status === "SUCCESS" ? "success" : "warning"}>
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
