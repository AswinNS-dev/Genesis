import Link from "next/link";
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
  Phone,
  Database,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { SEVERITY_META } from "@/components/entities/entity-helpers";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 3600 * 1000;
const TREND_WEEKS = 8;

function caseTrend(
  records: { createdAt: Date }[],
  weeks: number
): { label: string; value: number }[] {
  const bins = Array.from({ length: weeks }, () => 0);
  const nowMs = Date.now();
  for (const r of records) {
    const age = nowMs - new Date(r.createdAt).getTime();
    const idx = Math.floor(age / WEEK_MS);
    if (idx >= 0 && idx < weeks) bins[idx]++;
  }
  // Oldest week first (left to right), most recent on the right.
  return bins
    .map((value, i) => ({
      label: new Date(nowMs - (i + 1) * WEEK_MS).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value,
    }))
    .reverse();
}

export default async function DashboardPage() {
  const [openCases, closedCases, totalEntities, totalRels, aiAlerts, evidenceCount, recentCases, recentAlerts, recentEvidence, openSecurity, allCases, topComms, datasetAgg, datasetRecords, dsMerged, dsCandidate, dsUnmatched, recentActivity] =
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
      prisma.investigationCase.findMany({ select: { createdAt: true } }),
      prisma.relationship.findMany({
        where: { type: "COMMUNICATION" },
        orderBy: { count: "desc" },
        take: 5,
        include: { source: { select: { name: true } }, target: { select: { name: true } } },
      }),
      prisma.dataset.findMany({ select: { id: true, status: true } }),
      prisma.datasetRecord.count(),
      prisma.datasetRecord.count({ where: { matchStatus: "MERGED" } }),
      prisma.datasetRecord.count({ where: { matchStatus: "CANDIDATE" } }),
      prisma.datasetRecord.count({ where: { matchStatus: "UNMATCHED" } }),
      prisma.caseActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { case: { select: { caseId: true } } },
      }),
    ]);

  const clusters = Array.from(new Set((await prisma.entity.findMany({ select: { type: true } })).map((e) => e.type))).length;
  const trend = caseTrend(allCases, TREND_WEEKS);
  const maxTrend = Math.max(...trend.map((b) => b.value), 1);
  const maxComms = Math.max(...topComms.map((c) => c.count), 1);
  const reviewsPending = dsCandidate + dsUnmatched;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Command Overview"
        description="Live intelligence dashboard — case load, entity coverage, data intake and integrity status."
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Case activity trend */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Case activity trend"
            description={`Cases created per week · last ${TREND_WEEKS} weeks`}
            action={<Badge variant="outline">{allCases.length} total</Badge>}
          />
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {trend.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted">{b.value || ""}</span>
                  <div
                    className="w-full rounded-t-md bg-accent/60"
                    style={{ height: `${Math.max(4, (b.value / maxTrend) * 100)}%` }}
                  />
                  <span className="whitespace-nowrap text-[9px] text-muted/70">{b.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data workspace snapshot */}
        <Card>
          <CardHeader
            title="Data intake"
            description="Ingested datasets and match review"
            action={
              <Link href="/data-workspace" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniTile icon={Database} label="Datasets" value={datasetAgg.length} tint="text-accent" />
              <MiniTile icon={FileText} label="Records" value={datasetRecords} tint="text-sky-400" />
              <MiniTile icon={CheckCircle2} label="Merged" value={dsMerged} tint="text-success" />
              <MiniTile icon={Activity} label="Awaiting review" value={reviewsPending} tint="text-warning" />
            </div>
            {reviewsPending > 0 ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                <span className="text-xs text-muted">
                  {dsCandidate} potential match{dsCandidate === 1 ? "" : "es"} · {dsUnmatched} unmatched
                </span>
                <Badge variant="warning">review needed</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent Cases" description="Latest case dockets" action={<Badge variant="outline">{openCases} open</Badge>} />
          <CardContent className="space-y-2.5">
            {recentCases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-surface-raised">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
                  <FolderKanban className="h-4 w-4 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{c.title}</p>
                  <p className="text-xs text-muted">{c.caseId} · {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={c.status === "OPEN" ? "success" : "default"}>{c.status.toLowerCase()}</Badge>
              </Link>
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

        {/* Top communication clusters */}
        <Card>
          <CardHeader
            title="Top communication clusters"
            description="Highest call volume between entities"
            action={
              <Link href="/analysis" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong">
                Analysis <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent>
            {topComms.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No communication records.</p>
            ) : (
              <div className="space-y-3">
                {topComms.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="truncate font-medium text-foreground">
                        {c.source.name} → {c.target.name}
                      </span>
                      <span className="ml-auto text-muted">{c.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-raised">
                      <div
                        className="h-1.5 rounded-full bg-accent/70"
                        style={{ width: `${(c.count / maxComms) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            description="Latest case actions and actor trail"
            action={<Clock className="h-4 w-4 text-muted" />}
          />
          <CardContent className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No activity yet.</p>
            ) : (
              recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 p-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                    <Activity className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                      {a.detail ? <span className="text-muted"> — {a.detail}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {a.case?.caseId ?? "System"} · {a.actor ?? "system"} · {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
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

function MiniTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tint}`} />
        <p className="text-xs text-muted">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-semibold text-foreground">{value}</p>
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