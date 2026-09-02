import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { entityService } from "@backend/services/entity.service";

export const dynamic = "force-dynamic";

/**
 * Global investigation search.
 * GET /api/search?q=Rahul+Kumar&limit=25
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 25);

  const results = await entityService.search(q, limit);
  return NextResponse.json({ query: q, count: results.length, results });
}