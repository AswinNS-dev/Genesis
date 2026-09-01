import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { body?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Note is required" }, { status: 400 });

  const note = await prisma.caseNote.create({
    data: {
      caseId: params.id,
      body: text,
      author: session.user.name ?? undefined,
      authorId: (session.user as { id?: string }).id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "NOTE_ADDED",
      detail: `Note added to case`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
