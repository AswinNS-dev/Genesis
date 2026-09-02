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

  const incidentRaw = body.incidentDate ? String(body.incidentDate) : "";
  let incidentDate: Date | null = null;
  if (incidentRaw) {
    const parsed = new Date(incidentRaw);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "incidentDate is not a valid date" }, { status: 400 });
    }
    incidentDate = parsed;
  }

  const user = session.user as { id?: string; name?: string; role?: string };

  const created = await caseService.createCase({
    title,
    description: String(body.description ?? "").trim() || undefined,
    status: String(body.status ?? "OPEN").toUpperCase(),
    classification: String(body.classification ?? "RESTRICTED").toUpperCase(),
    category: String(body.category ?? "").trim() || undefined,
    caseSource: String(body.caseSource ?? "").trim() || undefined,
    incidentDate,
    jurisdiction: String(body.jurisdiction ?? "").trim() || undefined,
    assignedInvestigator: String(body.assignedInvestigator ?? "").trim() || user.name,
    userId: user.id,
  });

  return NextResponse.json({ case: created }, { status: 201 });
}