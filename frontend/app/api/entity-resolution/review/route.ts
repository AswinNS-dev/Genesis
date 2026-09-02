import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { entityResolutionService, type ReviewStatus } from "@backend/services/entity-resolution.service";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Minimum ANALYST or INVESTIGATOR to submit decisions
    if (!isRole(session.user.role, "ANALYST")) {
      return NextResponse.json({ error: "Forbidden: Minimum Analyst role required." }, { status: 403 });
    }

    const body = await req.json();
    const { candidateId, decision, reviewNote } = body;

    if (!candidateId || !decision) {
      return NextResponse.json({ error: "Missing candidateId or decision." }, { status: 400 });
    }

    const investigator = {
      id: (session.user as any).id || "USR-ANALYST",
      name: session.user.name || "Investigator",
    };

    const updated = await entityResolutionService.submitReview(
      candidateId,
      decision as ReviewStatus,
      investigator,
      reviewNote
    );

    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
