import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { temporalService } from "@backend/services/temporal.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId") ?? "";
    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const crimeTimestamp = url.searchParams.get("crimeTimestamp") || undefined;
    const beforeWindowMinutes = url.searchParams.get("beforeWindowMinutes")
      ? Number(url.searchParams.get("beforeWindowMinutes"))
      : undefined;
    const afterWindowMinutes = url.searchParams.get("afterWindowMinutes")
      ? Number(url.searchParams.get("afterWindowMinutes"))
      : undefined;
    const baselineDays = url.searchParams.get("baselineDays")
      ? Number(url.searchParams.get("baselineDays"))
      : undefined;

    const result = await temporalService.detectTemporalAnomalies({
      caseId,
      crimeTimestamp,
      beforeWindowMinutes,
      afterWindowMinutes,
      baselineDays,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Temporal detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role ?? "";
    if (!["INVESTIGATOR", "ANALYST", "ADMIN", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const caseId = body.caseId;
    if (!caseId) {
      return NextResponse.json({ error: "caseId is required in request body" }, { status: 400 });
    }

    const result = await temporalService.detectTemporalAnomalies({
      caseId,
      crimeTimestamp: body.crimeTimestamp,
      beforeWindowMinutes: body.beforeWindowMinutes,
      afterWindowMinutes: body.afterWindowMinutes,
      baselineDays: body.baselineDays,
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: (session.user as { id?: string }).id,
          action: "TEMPORAL_DETECTION",
          detail: `Executed temporal anomaly detection for case ${result.crime.caseId} across [-${result.window.beforeMinutes}m, +${result.window.afterMinutes}m] window. Evaluated ${result.statistics.evaluatedEntitiesCount} entities (${result.statistics.anomalousEntitiesCount} anomalous).`,
          status: "SUCCESS",
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Temporal detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
