import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { evidenceService } from "@backend/services/evidence.service";

export const dynamic = "force-dynamic";

// Verify evidence hash against the blockchain ledger.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await evidenceService.verify(params.id, session.user.name ?? undefined);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}