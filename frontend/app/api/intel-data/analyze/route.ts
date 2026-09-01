import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { analyzeRelationship } from "@backend/lib/graph-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const a = url.searchParams.get("a");
  const b = url.searchParams.get("b");
  if (!a || !b) return NextResponse.json({ error: "a and b required" }, { status: 400 });

  const analysis = await analyzeRelationship(a, b);
  return NextResponse.json({ analysis });
}
