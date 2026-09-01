import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { reportService } from "@backend/services/report.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "";
  if (!["INVESTIGATOR", "ANALYST", "ADMIN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  if (!caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 });

  try {
    const report = await reportService.generateForCase(
      caseId,
      `${session.user.name ?? "investigator"} (${(session.user as { role?: string }).role ?? ""})`
    );
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}