import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { TransactionAnalysisEngine } from "@backend/intelligence/transaction-analysis";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch financial relationships from database
  const rels = await prisma.relationship.findMany({
    where: { type: { in: ["FINANCIAL", "TRANSACTION"] } },
    include: {
      source: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
    },
  });

  const records = rels.map((r) => ({
    sender: r.source.name,
    receiver: r.target.name,
    amount: r.count * 10000, // Estimated volume baseline
    count: r.count,
    timestamp: r.createdAt,
  }));

  const analysis = TransactionAnalysisEngine.analyze(records);
  return NextResponse.json(analysis);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const records = Array.isArray(body) ? body : (body.records ?? []);
    const options = {
      baselineRatesPerPeriod: body.baselineRatesPerPeriod,
      historicalKnownPairs: body.historicalKnownPairs,
    };

    const analysis = TransactionAnalysisEngine.analyze(records, options);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
  }
}
