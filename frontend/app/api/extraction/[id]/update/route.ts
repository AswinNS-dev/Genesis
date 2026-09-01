import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

// Edit an extraction candidate's value before confirming.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { value?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const value = (body.value ?? "").trim();
  if (!value) return NextResponse.json({ error: "Value is required" }, { status: 400 });

  const cand = await prisma.extractionCandidate.findUnique({
    where: { id: params.id },
    include: { document: { select: { caseId: true } } },
  });
  if (!cand) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  await prisma.extractionCandidate.update({
    where: { id: params.id },
    data: { editedValue: value, status: "CONFIRMED" },
  });

  // Create the edited entity.
  let entity = await prisma.entity.findFirst({ where: { type: cand.type, name: value } });
  if (!entity) {
    entity = await prisma.entity.create({
      data: { type: cand.type, name: value, caseId: cand.document?.caseId ?? undefined },
    });
  }

  return NextResponse.json({ entity });
}
