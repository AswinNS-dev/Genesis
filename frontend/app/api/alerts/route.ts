import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

// Recent AI-generated alerts surfaced for investigator review.
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.aIAlert.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      message: a.message,
      detail: a.detail,
      read: a.read,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}