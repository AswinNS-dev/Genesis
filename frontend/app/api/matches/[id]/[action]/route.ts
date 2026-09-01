import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; action: "confirm" | "reject" } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const match = await prisma.entityMatch.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "PENDING")
    return NextResponse.json({ error: "Match already resolved" }, { status: 400 });

  const status = params.action === "confirm" ? "CONFIRMED" : "REJECTED";
  await prisma.entityMatch.update({ where: { id: match.id }, data: { status } });

  // On confirm, merge aliases so search/analysis sees both names.
  if (params.action === "confirm") {
    const [a, b] = await Promise.all([
      prisma.entity.findUnique({ where: { id: match.entityAId } }),
      prisma.entity.findUnique({ where: { id: match.entityBId } }),
    ]);
    if (a && b) {
      const aliases = Array.from(new Set([...(JSON.parse(a.aliases ?? "[]") as string[]), b.name]));
      await prisma.entity.update({ where: { id: a.id }, data: { aliases: JSON.stringify(aliases) } });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "ENTITY_MERGED",
      detail: `Entity match ${params.action}ed`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ ok: true });
}
