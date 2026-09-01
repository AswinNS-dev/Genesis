import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

// Confirm an extraction candidate -> create entity + link it to the case/document.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cand = await prisma.extractionCandidate.findUnique({
    where: { id: params.id },
    include: { document: { include: { case: true } } },
  });
  if (!cand) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (cand.status !== "PENDING")
    return NextResponse.json({ error: "Candidate already processed" }, { status: 400 });

  const value = cand.editedValue?.trim() || cand.value.trim();

  // Reuse an existing entity with the same name+type where possible.
  let entity = await prisma.entity.findFirst({
    where: { type: cand.type, name: value },
  });
  if (!entity) {
    entity = await prisma.entity.create({
      data: { type: cand.type, name: value, caseId: cand.document.caseId },
    });
  }

  await prisma.extractionCandidate.update({
    where: { id: cand.id },
    data: { status: "CONFIRMED" },
  });

  await prisma.caseActivity.create({
    data: {
      caseId: cand.document.caseId,
      action: "ENTITY_ADDED",
      detail: `${cand.type}: ${value} confirmed from ${cand.document.name}`,
      actor: session.user.name ?? undefined,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "ENTITY_CONFIRMED",
      detail: `${cand.type}: ${value}`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ entity });
}
