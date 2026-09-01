import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Share2,
  Sparkles,
  FileText,
  ShieldAlert,
  Link2,
  Bell,
  ScrollText,
  Activity,
} from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { SEVERITY_META } from "@/components/entities/entity-helpers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [openCases, closedCases, totalEntities, totalRels, aiAlerts, evidenceCount, recentCases, recentAlerts, recentEvidence, openSecurity] =
    await Promise.all([
      prisma.investigationCase.count({ where: { status: "OPEN" } }),
      prisma.investigationCase.count({ where: { status: { not: "OPEN" } } }),
      prisma.entity.count(),
      prisma.relationship.count(),
      prisma.aIAlert.count(),
      prisma.evidenceDocument.count(),
      prisma.investigationCase.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.aIAlert.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.evidenceDocument.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.securityAlert.count({ where: { resolved: false } }),
    ]);

  const clusters = Array.from(new Set((await prisma.entity.findMany({ select: { type: true } })).map((e) => e.type))).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Command Overview"
        description="Live intelligence dashboard — case load, entity coverage, and integrity status."
        icon={LayoutDashboard}
        badge="Demo"
      />

      <Alert variant="warning" title="Prototype notice">
        All data on this platform is entirely fictional. AI outputs are investigative leads that
        require human verification — never determinations of guilt.
      </Alert>

      {openSecurity > 0 ? (
        <Alert variant="danger" title={`${openSecurity} open security alert${openSecurity > 1 ? "s" : ""}`}>
          Review the Security module for threat details.
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Active Cases" value={openCases} icon={FolderKanban} tint="text-sky-400" hint={`${closedCases} closed`} />
        <StatCard title="Total Entities" value={totalEntities} icon={Users} tint="text-sky-400" />
        <StatCard title="Relationships" value={totalRels} icon={Share2} tint="text-accent" />
        <StatCard title="AI Alerts" value={aiAlerts} icon={Sparkles} tint="text-warning" />
        <StatCard title="Evidence Files" value={evidenceCount} icon={FileText} tint="text-accent" />
        <StatCard title="Network Clusters" value={clusters} icon={Activity} tint="text-success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent Cases" description="Latest case dockets" action={<Badge variant="outline">{openCases} open</Badge>} />
          <CardContent className="space-y-2.5">
            {recentCases.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                  <FolderKanban className="h-4 w-4 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{c.title}</p>
                  <p className="text-xs text-muted">{c.caseId} · {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={c.status === "OPEN" ? "success" : "default"}>{c.status.toLowerCase()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Recent AI Alerts" description="Generated investigative signals" action={<Bell className="h-4 w-4 text-muted" />} />
          <CardContent className="space-y-2.5">
            {recentAlerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No AI alerts yet.</p>
            ) : (
              recentAlerts.map((a) => {
                const sev = SEVERITY_META[a.severity] ?? SEVERITY_META.MEDIUM;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{a.message}</p>
                      {a.detail ? <p className="text-xs text-muted">{a.detail}</p> : null}
                    </div>
                    <Badge variant={sev.variant}>{sev.label}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent Evidence" description="Recently notarized exhibits" action={<Link2 className="h-4 w-4 text-muted" />} />
          <CardContent className="space-y-2.5">
            {recentEvidence.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No evidence uploaded yet.</p>
            ) : (
              recentEvidence.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                    <FileText className="h-4 w-4 text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{e.name}</p>
                    <p className="break-all font-mono text-[10px] text-muted">{e.sha256?.slice(0, 24)}…</p>
                  </div>
                  <Badge variant={e.status === "VERIFIED" ? "success" : e.status === "COMPROMISED" ? "danger" : "outline"}>
                    {e.status.toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Integrity & Security" description="Threat and integrity status" />
          <CardContent className="space-y-3">
            <AuditRow icon={ShieldAlert} label="Threat detection" status={openSecurity > 0 ? `${openSecurity} alert(s)` : "Clear"} ok={openSecurity === 0} />
            <AuditRow icon={ScrollText} label="Audit trail" status="Active" ok />
            <AuditRow icon={Link2} label="Exhibits hashed" status={`${evidenceCount} block(s)`} ok={evidenceCount > 0} />
            <AuditRow icon={Link2} label="Prototype ledger" status="Genesis + chained" ok />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuditRow({
  icon: Icon,
  label,
  status,
  ok,
}: {
  icon: React.ElementType;
  label: string;
  status: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{label}</p>
      </div>
      <Badge variant={ok ? "success" : "warning"}>{status}</Badge>
    </div>
  );
}
