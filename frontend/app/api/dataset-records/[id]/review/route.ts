import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { matchingService } from "@backend/services/matching.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { decision?: string } | null;
  if (!body || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }

  try {
    const result = await matchingService.review(params.id, body.decision, {
      id: (session.user as { id?: string }).id,
      name: session.user.name ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    const status = message.includes("not found") || message.includes("Only potential") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}