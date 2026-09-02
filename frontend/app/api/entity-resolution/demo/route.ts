import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { entityResolutionService } from "@backend/services/entity-resolution.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await entityResolutionService.runSection23Demo();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Demo run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
