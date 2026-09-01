import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cand = await prisma.extractionCandidate.findUnique({ where: { id: params.id } });
  if (!cand) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (cand.status !== "PENDING")
    return NextResponse.json({ error: "Candidate already processed" }, { status: 400 });

  await prisma.extractionCandidate.update({
    where: { id: cand.id },
    data: { status: "REJECTED" },
  });
  return NextResponse.json({ ok: true });
}
