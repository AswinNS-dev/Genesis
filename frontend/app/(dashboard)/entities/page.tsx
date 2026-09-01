import type { Metadata } from "next";
import { Users } from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/state";
import { entityColor, entityLabel } from "@/components/entities/entity-helpers";
import { MatchActions } from "./match-actions";

export const metadata: Metadata = { title: "Entities" };
export const dynamic = "force-dynamic";

export default async function EntitiesPage() {
  const session = await getSession();
  const canEdit = isRole(session?.user?.role, "INVESTIGATOR");

  const [entities, matches] = await Promise.all([
    prisma.entity.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.entityMatch.findMany({
      include: { entityA: true, entityB: true },
      orderBy: { confidence: "desc" },
    }),
  ]);

  const peopleCount = entities.filter((e) => e.type === "PERSON").length;
  const types = Array.from(new Set(entities.map((e) => e.type)));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Entity Registry"
        description="Persons, phones, vehicles, locations, organizations and possible duplicates."
        icon={Users}
        badge="Graph-connected"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total entities" value={entities.length} icon={Users} />
        <StatCard title="People" value={peopleCount} icon={Users} tint="text-sky-400" />
        <StatCard title="Entity types" value={types.length} icon={Users} tint="text-accent" />
        <StatCard
          title="Possible matches"
          value={matches.filter((m) => m.status === "PENDING").length}
          icon={Users}
          tint="text-warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Registry */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Registry" description="All extracted entities" />
            <CardContent>
              {entities.length === 0 ? (
                <EmptyState title="No entities" />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {entities.map((e) => {
                    const color = entityColor(e.type);
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised/40 px-3 py-2"
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md"
                          style={{ background: `${color}22` }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{e.name}</p>
                          <p className="text-[11px] text-muted">{entityLabel(e.type)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Matches */}
        <Card>
          <CardHeader
            title="Entity matching"
            description="Possible duplicates across cases"
          />
          <CardContent className="space-y-3">
            {matches.length === 0 ? (
              <EmptyState title="No matches found" />
            ) : (
              matches.map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-foreground">
                      {m.entityA.name} <span className="text-muted">↔</span> {m.entityB.name}
                    </div>
                    <Badge variant={m.confidence >= 75 ? "warning" : "outline"}>
                      {m.confidence}%
                    </Badge>
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
                    <div className="mt-2">
                      <MatchActions matchId={m.id} canEdit={canEdit} />
                    </div>
                  ) : (
                    <div className="mt-2">
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
      </div>
    </div>
  );
}
