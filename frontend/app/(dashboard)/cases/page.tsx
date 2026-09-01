import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";
import { NewCaseDialog } from "./new-case-dialog";
import { CASE_STATUS_META } from "@/components/entities/entity-helpers";

export const metadata: Metadata = { title: "Cases" };
export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const session = await getSession();
  const canEdit = isRole(session?.user?.role, "INVESTIGATOR");

  const cases = await prisma.investigationCase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { documents: true, entities: true, notes: true } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Case Management"
        description="Investigation dockets, notes, evidence, and activity."
        icon={FolderKanban}
        actions={canEdit ? <NewCaseDialog /> : null}
      />

      {cases.length === 0 ? (
        <Card>
          <EmptyState
            title="No cases yet"
            description="Create your first investigation case to begin."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((c) => {
            const st = CASE_STATUS_META[c.status] ?? CASE_STATUS_META.OPEN;
            return (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted">{c.caseId}</p>
                    <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="line-clamp-3 text-xs text-muted">{c.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span className="flex items-center gap-3">
                      <span>{c._count.documents} evidence</span>
                      <span>{c._count.entities} entities</span>
                    </span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
                <div className="border-t border-border px-4 py-2 text-[11px] text-muted">
                  {c.assignedInvestigator ?? "Unassigned"}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
