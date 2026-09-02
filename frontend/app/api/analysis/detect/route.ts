import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { patternDetectionService } from "@backend/services/pattern.service";

export const dynamic = "force-dynamic";

// Run pattern + anomaly detection across the full intelligence graph and
// persist resulting patterns + AI alerts.
export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "";
  if (!["INVESTIGATOR", "ANALYST", "ADMIN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await patternDetectionService.detectAll();

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "PATTERN_DETECTION",
      detail: `Detected ${result.patterns.length} patterns (${result.created} new), ${result.anomalies.length} anomalies, ${result.alertsCreated} alerts persisted`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json(result);
}