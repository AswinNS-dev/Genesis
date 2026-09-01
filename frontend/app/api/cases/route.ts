import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; description?: string; caseId?: string; assignedInvestigator?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // Generate next case ID.
  const last = await prisma.investigationCase.findFirst({ orderBy: { createdAt: "desc" } });
  const seq = last ? Number(last.caseId.split("-").pop()) + 1 : 1001;
  const caseId = `CR-2026-${seq}`;

  const created = await prisma.investigationCase.create({
    data: {
      caseId,
      title,
      description,
      assignedInvestigator: body.assignedInvestigator ?? session.user.name ?? null,
      createdById: (session.user as { id?: string }).id,
    },
  });

  await prisma.caseActivity.create({
    data: { caseId: created.id, action: "CASE_CREATED", detail: title, actor: session.user.name ?? undefined },
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "CASE_CREATED",
      detail: `Created ${caseId}: ${title}`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ case: created }, { status: 201 });
}
