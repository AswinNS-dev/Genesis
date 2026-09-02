import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { graphAnalysisService } from "@backend/services/graph-analysis.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sourceId = url.searchParams.get("source") ?? "";
    const targetId = url.searchParams.get("target") ?? "";
    const maxDepth = Number(url.searchParams.get("maxDepth") ?? 4);

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: "Both source and target query parameters are required." },
        { status: 400 }
      );
    }

    const result = await graphAnalysisService.findEntityPath(sourceId, targetId, maxDepth);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Path search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
