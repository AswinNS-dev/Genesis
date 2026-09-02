import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { buildEgocentricGraph } from "@backend/lib/graph-data";

export const dynamic = "force-dynamic";

// Build a person-focused (egocentric) knowledge graph: the source entity plus
// everything reachable within `hops` links. Consumed by the Analysis page.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const entity = url.searchParams.get("entity");
  const hops = Math.min(3, Math.max(1, Number(url.searchParams.get("hops") ?? 2)));
  if (!entity) return NextResponse.json({ error: "entity is required" }, { status: 400 });

  try {
    const graph = await buildEgocentricGraph(entity, hops);
    return NextResponse.json({ sourceId: entity, hops, ...graph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build graph";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}