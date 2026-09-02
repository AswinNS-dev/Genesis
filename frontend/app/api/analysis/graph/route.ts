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
    const filters = {
      caseId: url.searchParams.get("caseId") || undefined,
      crimeType: url.searchParams.get("crimeType") || undefined,
      district: url.searchParams.get("district") || undefined,
      policeStation: url.searchParams.get("policeStation") || undefined,
      entityType: url.searchParams.get("entityType") || undefined,
      searchQuery: url.searchParams.get("searchQuery") || url.searchParams.get("q") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      focusEntityId: url.searchParams.get("focusEntityId") || undefined,
      focusHops: url.searchParams.get("focusHops") ? parseInt(url.searchParams.get("focusHops")!, 10) : undefined,
    };

    const analysis = await graphAnalysisService.analyzeFullGraph(filters);
    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Graph analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const analysis = await graphAnalysisService.analyzeFullGraph(body);
    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Graph analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
