import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { evidenceService } from "@backend/services/evidence.service";

export const dynamic = "force-dynamic";

// PROTOTYPE ONLY: simulate tampering with an exhibit so investigators can see
// the integrity-verification red-alert flow. In production this route would
// never exist — tampering is detected, not induced.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await evidenceService.simulateTamper(
      params.id,
      (session.user as { id?: string }).id
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tamper simulation failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}