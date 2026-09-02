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
    const caseId = url.searchParams.get("caseId") || undefined;

    const analysis = await graphAnalysisService.analyzeFullGraph(caseId);
    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Graph analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
