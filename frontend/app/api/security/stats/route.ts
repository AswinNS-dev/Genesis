import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const alertPage = Math.max(1, parseInt(url.searchParams.get("alertPage") ?? "1"));
  const loginPage = Math.max(1, parseInt(url.searchParams.get("loginPage") ?? "1"));
  const limit = 15;

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    openAlerts,
    totalAlerts,
    failedLogins24h,
    successLogins24h,
    recentAttempts,
    totalAttempts,
    reportEvents7d,
    dossierEvents7d,
    entityDecisions7d,
    unauthorizedEvents7d,
    dataModifications7d,
    integrityAlerts,
  ] = await Promise.all([
    prisma.securityAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (alertPage - 1) * limit,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.securityAlert.count({ where: { resolved: false } }),
    prisma.loginAttempt.count({ where: { success: false, attemptAt: { gte: since24h } } }),
    prisma.loginAttempt.count({ where: { success: true, attemptAt: { gte: since24h } } }),
    prisma.loginAttempt.findMany({
      take: limit,
      skip: (loginPage - 1) * limit,
      orderBy: { attemptAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.loginAttempt.count(),
    prisma.auditLog.count({ where: { action: "REPORT_GENERATED", createdAt: { gte: since7d } } }),
    prisma.auditLog.count({ where: { action: { contains: "DOSSIER" }, createdAt: { gte: since7d } } }),
    prisma.auditLog.count({ where: { action: { contains: "ENTITY_RESOLUTION" }, createdAt: { gte: since7d } } }),
    prisma.auditLog.count({ where: { status: "FORBIDDEN", createdAt: { gte: since7d } } }),
    prisma.auditLog.count({
      where: {
        action: { in: ["EVIDENCE_MODIFIED", "CASE_UPDATED", "ENTITY_MERGED", "ALERT_RESOLVED"] },
        createdAt: { gte: since7d },
      },
    }),
    prisma.securityAlert.count({ where: { type: "TAMPER" } }),
  ]);

  return NextResponse.json({
    stats: {
      openAlerts: totalAlerts,
      failedLogins24h,
      successLogins24h,
      reportEvents7d,
      dossierEvents7d,
      entityDecisions7d,
      unauthorizedEvents7d,
      dataModifications7d,
      integrityAlerts,
    },
    alerts: openAlerts,
    alertPages: Math.ceil(totalAlerts / limit),
    alertPage,
    attempts: recentAttempts,
    attemptPages: Math.ceil(totalAttempts / limit),
    loginPage,
  });
}
