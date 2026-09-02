import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

// Return a single case with the PERSONS linked to it, so the Analysis
// page can populate a person-focused knowledge-graph selector.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cs = await prisma.investigationCase.findUnique({
    where: { id: params.id },
    include: {
      entities: { orderBy: { name: "asc" }, select: { id: true, name: true, type: true } },
    },
  });
  if (!cs) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const persons = (cs.entities ?? []).filter((e) => e.type === "PERSON");
  return NextResponse.json({ case: cs, persons });
}