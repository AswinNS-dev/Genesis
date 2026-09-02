import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "CANDIDATE";

  const records = await prisma.datasetRecord.findMany({
    where: { matchStatus: status },
    orderBy: [{ matchConfidence: "desc" }, { updatedAt: "desc" }],
    include: {
      dataset: { select: { id: true, name: true, sourceType: true } },
      matchCandidate: { select: { id: true, name: true, type: true } },
      mergedEntity: { select: { id: true, name: true, type: true } },
    },
    take: 100,
  });

  return NextResponse.json({ records });
}