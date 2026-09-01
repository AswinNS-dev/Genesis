import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { dataPipeline } from "@backend/services/pipeline.service";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

const SUPPORTED = new Set(["CSV", "JSON", "TXT"]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    content?: string;
    sourceType?: string;
    fileName?: string;
    caseId?: string;
    analysisScope?: "COMBINED" | "DATASET_ONLY";
  } | null;

  if (!body?.content || !body?.sourceType || !SUPPORTED.has(body.sourceType)) {
    return NextResponse.json(
      { error: "content and a supported sourceType (CSV | JSON | TXT) are required" },
      { status: 400 }
    );
  }

  const scope = body.analysisScope === "DATASET_ONLY" ? "DATASET_ONLY" : "COMBINED";
  if (scope === "DATASET_ONLY" && !body.caseId) {
    return NextResponse.json(
      { error: "A dataset-only analysis requires linking the dataset to a case (caseId is required)" },
      { status: 400 }
    );
  }

  try {
    const result = await dataPipeline.ingest({
      content: body.content,
      sourceType: body.sourceType as "CSV" | "JSON" | "TXT",
      fileName: body.fileName,
      caseId: body.caseId,
      analysisScope: scope,
      createdById: (session.user as { id?: string }).id,
      userName: session.user.name ?? undefined,
    });
    await prisma.auditLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        action: "DATASET_INGESTED",
        detail: `${result.dataset.name} — ${result.summary?.total ?? 0} records (analysis scope: ${scope})`,
        status: result.summary ? "SUCCESS" : "ERROR",
      },
    });
    return NextResponse.json(result, { status: result.summary ? 201 : 422 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}