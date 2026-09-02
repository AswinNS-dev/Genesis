import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { buildDatasetGraph } from "@backend/lib/graph-data";

export const dynamic = "force-dynamic";

// Cross-dataset relationship graph. Returns a focused person's network,
// optionally expanded through the existing database with new/existing nodes
// tagged so cross-links are emphasized.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const personId = url.searchParams.get("person") ?? undefined;
  const expand = url.searchParams.get("expand") !== "false";
  const hops = Math.min(3, Math.max(1, Number(url.searchParams.get("hops") ?? 2)));

  try {
    const graph = await buildDatasetGraph(params.id, { personId, expand, maxHops: hops });
    return NextResponse.json({ datasetId: params.id, expand, hops, ...graph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build graph";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}