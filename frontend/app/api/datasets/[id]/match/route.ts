import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { matchingService } from "@backend/services/matching.service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await matchingService.runMatching(params.id, session.user.name ?? undefined);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Matching failed";
    const status = message.includes("not found") || message.includes("ingestion first") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}