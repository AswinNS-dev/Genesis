import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/state";
import {
  entityColor,
  entityIcon,
  entityLabel,
  relationColor,
  relationLabel,
} from "@/components/entities/entity-helpers";
import { MatchActions } from "../match-actions";

export const metadata: Metadata = { title: "Entity Investigation" };
export const dynamic = "force-dynamic";

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default async function EntityInvestigationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  const canEdit = isRole(session?.user?.role, "INVESTIGATOR");

  const entity = await prisma.entity.findUnique({
    where: { id: params.id },
    include: {
      case: { select: { id: true, caseId: true, title: true } },
      sourceRelationships: { include: { target: true } },
      targetRelationships: { include: { source: true } },
      matchesTargetA: { include: { entityB: true } },
      matchesTargetB: { include: { entityA: true } },
      timelineEvents: { orderBy: { eventAt: "desc" }, take: 15 },
    },
  });
  if (!entity) notFound();

  const [datasetRecords, extractions] = await Promise.all([
    prisma.datasetRecord.findMany({
      where: {
        OR: [{ matchCandidateId: entity.id }, { mergedEntityId: entity.id }],
      },
      include: { dataset: { select: { id: true, name: true, status: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.extractionCandidate.findMany({
      where: {
        type: entity.type,
        OR: [
          { value: { contains: entity.name } },
          { editedValue: { contains: entity.name } },
        ],
      },
      include: { document: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const edges = [
    ...entity.sourceRelationships.map((r) => ({
      id: `out-${r.id}`,
      other: r.target,
      direction: "out",
      type: r.type,
      label: r.label,
      count: r.count,
      strength: r.strength,
    })),
    ...entity.targetRelationships.map((r) => ({
      id: `in-${r.id}`,
      other: r.source,
      direction: "in",
      type: r.type,
      label: r.label,
      count: r.count,
      strength: r.strength,
    })),
  ].sort((a, b) => b.strength - a.strength);

  const matches = [
    ...entity.matchesTargetA.map((m) => ({ m, other: m.entityB })),
    ...entity.matchesTargetB.map((m) => ({ m, other: m.entityA })),
  ].sort((a, b) => b.m.confidence - a.m.confidence);

  const aliases = safeJson<string[]>(entity.aliases, []);
  const metadata = safeJson<Record<string, string>>(entity.metadata, {});
  const Icon = entityIcon(entity.type);
  const color = entityColor(entity.type);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/entities"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to entity registry
        </Link>
        <PageHeader
          title={entity.name}
          description={`${entityLabel(entity.type)} investigation workspace`}
          icon={Icon}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="outline" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {entityLabel(entity.type)}
              </Badge>
              {entity.riskScore > 0 ? <Badge variant="warning">{entity.riskScore} risk</Badge> : null}
              {entity.case ? (
                <Link href={`/cases/${entity.case.id}`}>
                  <Badge variant="outline" className="hover:border-accent/50">{entity.case.caseId}</Badge>
                </Link>
              ) : null}
            </div>
          }
        />
      </div>

      <Alert variant="info" title="Investigation record">
        This profile aggregates connections and source references. Relationships are potential
        associations requiring human review — never determinations of guilt.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Profile" description="Identity and attributes" />
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Type" value={entityLabel(entity.type)} />
            {entity.value ? <DetailRow label="Value" value={`${entity.value}`} mono /> : null}
            <div>
              <p className="text-xs text-muted">Source case</p>
              <p className="mt-0.5">
                {entity.case ? (
                  <Link href={`/cases/${entity.case.id}`} className="font-medium text-accent hover:underline">
                    {entity.case.caseId} — {entity.case.title}
                  </Link>
                ) : (
                  <span className="text-muted">Not linked to a case</span>
                )}
              </p>
            </div>
            <DetailRow label="Risk score" value={entity.riskScore === 0 ? "None flagged" : `${entity.riskScore}/100`} />
            <DetailRow label="First seen" value={new Date(entity.createdAt).toLocaleDateString()} />
            {Object.entries(metadata).length > 0 ? (
              <div>
                <p className="text-xs text-muted">Attributes</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(metadata).map(([k, v]) => (
                    <span key={k} className="rounded bg-border/40 px-1.5 py-0.5 text-[11px] text-muted">
                      {k.replace(/_/g, " ")}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {aliases.length > 0 ? (
              <div>
                <p className="text-xs text-muted">Aliases & normalized forms</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {aliases.map((a) => (
                    <Badge key={a} variant="outline" className="text-[11px]">{a}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Connections"
            description={`${edges.length} relationship${edges.length === 1 ? "" : "s"} across the graph`}
            action={<Badge variant="outline">{edges.length}</Badge>}
          />
          <CardContent className="space-y-1.5">
            {edges.length === 0 ? (
              <EmptyState title="No connections yet" description="This entity is not linked to others." />
            ) : (
              edges.map((e) => {
                const relColor = relationColor(e.type);
                return (
                  <Link
                    key={e.id}
                    href={`/entities/${e.other.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2 transition-colors hover:border-accent/40"
                  >
                    {e.direction === "out" ? (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                    ) : (
                      <ArrowLeft className="h-4 w-4 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{e.other.name}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: relColor }} />
                        {relationLabel(e.type)}{e.label ? ` · ${e.label}` : ""}
                      </p>
                    </div>
                    {e.count > 0 ? <Badge variant="outline">{e.count}×</Badge> : null}
                    <Badge variant="outline">{e.strength}</Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Possible matches"
            description="Potential duplicates across cases and datasets"
            action={<Badge variant={matches.some((x) => x.m.status === "PENDING") ? "warning" : "outline"}>{matches.length}</Badge>}
          />
          <CardContent className="space-y-3">
            {matches.length === 0 ? (
              <EmptyState title="No matches" description="No duplicate candidates linked to this entity." />
            ) : (
              matches.map(({ m, other }) => (
                <div key={m.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/entities/${other.id}`} className="text-sm font-medium text-foreground hover:text-accent">
                        {other.name}
                      </Link>
                      <p className="text-[11px] text-muted">{entityLabel(other.type)}</p>
                    </div>
                    <Badge variant={m.confidence >= 75 ? "warning" : "outline"}>{m.confidence}% confidence</Badge>
                  </div>
                  {m.reasons ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(JSON.parse(m.reasons) as string[]).map((r) => (
                        <span key={r} className="rounded bg-border/40 px-1.5 py-0.5 text-[10px] text-muted">
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {m.status === "PENDING" ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge variant="outline">pending review</Badge>
                      <MatchActions matchId={m.id} canEdit={canEdit} />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px]">{other.name}</span>
                      <Badge variant={m.status === "CONFIRMED" ? "success" : "danger"}>
                        {m.status.toLowerCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Timeline" description="Entity-specific events" />
          <CardContent className="space-y-3">
            {entity.timelineEvents.length === 0 ? (
              <EmptyState title="No timeline events" />
            ) : (
              <div className="space-y-3">
                {entity.timelineEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{ev.summary}</p>
                      {ev.detail ? <p className="text-xs text-muted">{ev.detail}</p> : null}
                      <p className="mt-0.5 text-[11px] text-muted">
                        {new Date(ev.eventAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{ev.type.toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Dataset footprint"
            description="Records that matched or merged into this entity"
            action={
              <Link href="/data-workspace" className="text-xs font-medium text-accent hover:underline">
                Data workspace
              </Link>
            }
          />
          <CardContent className="space-y-2.5">
            {datasetRecords.length === 0 ? (
              <EmptyState title="No dataset records" />
            ) : (
              datasetRecords.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{r.dataset.name}</p>
                    <p className="text-[11px] text-muted">
                      row {r.rowIndex} · {r.matchConfidence}% confidence
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.matchStatus === "MERGED" ? "success" : r.matchStatus === "CANDIDATE" ? "warning" : "outline"
                    }
                  >
                    {r.matchStatus.toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Evidence extraction"
            description="Source documents this entity was extracted from"
          />
          <CardContent className="space-y-2.5">
            {extractions.length === 0 ? (
              <EmptyState title="No extraction records" description="This entity has not been linked to extracted evidence text." />
            ) : (
              extractions.map((x) => (
                <div key={x.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{x.document.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {x.value}{x.context ? ` — ${x.context}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      x.status === "CONFIRMED" ? "success" : x.status === "PENDING" ? "outline" : "default"
                    }
                  >
                    {x.status.toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-foreground ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}