import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolderKanban, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@backend/lib/prisma";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { CaseNotes } from "./notes";

export const metadata: Metadata = { title: "Case Detail" };
export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  const c = await prisma.investigationCase.findUnique({
    where: { id: params.id },
    include: {
      entities: true,
      documents: true,
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
      createdBy: { select: { name: true } },
    },
  });
  if (!c) notFound();

  const canEdit = isRole(session?.user?.role, "INVESTIGATOR");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/cases"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to cases
        </Link>
        <PageHeader
          title={c.caseId}
          description={c.title}
          icon={FolderKanban}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline">{c.classification}</Badge>
              <Badge variant="success">{c.status}</Badge>
            </div>
          }
        />
      </div>

      <Card>
        <CardContent>
          <p className="text-sm text-muted">{c.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted">Assigned</p>
              <p className="mt-0.5 font-medium text-foreground">{c.assignedInvestigator ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted">Created</p>
              <p className="mt-0.5 font-medium text-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted">Evidence files</p>
              <p className="mt-0.5 font-medium text-foreground">{c.documents.length}</p>
            </div>
            <div>
              <p className="text-muted">Entities</p>
              <p className="mt-0.5 font-medium text-foreground">{c.entities.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Entities" description="Confirmed people, orgs, vehicles, locations" />
          <CardContent>
            {c.entities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No entities yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {c.entities.map((e) => (
                  <Badge key={e.id} variant="outline" className="gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: entityColor(e.type) }} />
                    {e.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Evidence" description="Uploaded exhibits for this case" />
          <CardContent>
            {c.documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No evidence yet.</p>
            ) : (
              <div className="space-y-2">
                {c.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted" />
                    <span className="truncate text-foreground">{d.name}</span>
                    <span className="ml-auto text-xs text-muted">
                      {(d.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CaseNotes
          notes={c.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
          caseId={c.id}
          canEdit={canEdit}
        />

        <Card>
          <CardHeader title="Activity" description="Case history" />
          <CardContent>
            {c.activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {c.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{a.action}</p>
                      <p className="text-xs text-muted">{a.detail}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {a.actor ?? "System"} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function entityColor(type: string): string {
  const m: Record<string, string> = {
    PERSON: "#60a5fa",
    PHONE: "#34d399",
    VEHICLE: "#fbbf24",
    LOCATION: "#f472b6",
    ORGANIZATION: "#a78bfa",
  };
  return m[type] ?? "#8b9bb4";
}
