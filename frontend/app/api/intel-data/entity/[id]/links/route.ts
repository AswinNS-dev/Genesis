import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rels = await prisma.relationship.findMany({
    where: { OR: [{ sourceId: params.id }, { targetId: params.id }] },
    select: {
      id: true,
      type: true,
      strength: true,
      count: true,
      records: true,
      label: true,
      sourceId: true,
      targetId: true,
    },
  });

  const links = rels.map((r) => ({
    id: r.id,
    type: r.type,
    strength: r.strength,
    count: r.count,
    label: r.label,
    records: JSON.parse(r.records ?? "[]") as string[],
    otherId: r.sourceId === params.id ? r.targetId : r.sourceId,
  }));

  return NextResponse.json({ links });
}
