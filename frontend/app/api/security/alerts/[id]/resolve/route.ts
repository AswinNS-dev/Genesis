import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

// Mark a security alert as resolved. Restricted to privileged roles.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  void req; // body not used — action is implied by the route
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "";
  if (!["INVESTIGATOR", "ANALYST", "ADMIN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const alert = await prisma.securityAlert.findUnique({ where: { id: params.id } });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (alert.resolved) return NextResponse.json({ error: "Alert already resolved" }, { status: 400 });

  await prisma.securityAlert.update({
    where: { id: alert.id },
    data: { resolved: true, resolvedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "ALERT_RESOLVED",
      detail: `Resolved security alert: ${alert.message}`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ ok: true });
}