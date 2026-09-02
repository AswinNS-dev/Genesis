import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { caseService } from "@backend/services/case.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const user = session.user as { id?: string; name?: string; role?: string };

  const created = await caseService.createCase({
    title,
    description: String(body.description ?? ""),
    assignedInvestigator: String(body.assignedInvestigator ?? "").trim() || user.name,
    userId: user.id,
  });

  return NextResponse.json({ case: created }, { status: 201 });
}