import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { CommunicationAnalysisEngine } from "@backend/intelligence/communication-analysis";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch communication relationships from database
  const rels = await prisma.relationship.findMany({
    where: { type: "COMMUNICATION" },
    include: {
      source: { select: { id: true, name: true, type: true } },
      target: { select: { id: true, name: true, type: true } },
    },
  });

  const records = rels.map((r) => ({
    caller: r.source.name,
    receiver: r.target.name,
    count: r.count,
    strength: r.strength,
    timestamp: r.createdAt,
  }));

  const analysis = CommunicationAnalysisEngine.analyze(records);
  return NextResponse.json(analysis);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const records = Array.isArray(body) ? body : (body.records ?? []);
    const options = {
      baselineRates: body.baselineRates,
      historicalKnownPairs: body.historicalKnownPairs,
    };

    const analysis = CommunicationAnalysisEngine.analyze(records, options);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
  }
}
