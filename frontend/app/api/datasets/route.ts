import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { datasetService } from "@backend/services/dataset.service";
import { unauthorized, notFound } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const caseId = url.searchParams.get("caseId") ?? undefined;

  if (id) {
    try {
      const dataset = await datasetService.getById(id);
      const summary = await datasetService.summary(id);
      return NextResponse.json({ dataset, summary });
    } catch {
      return notFound("Dataset not found");
    }
  }

  const datasets = await datasetService.list(caseId);
  return NextResponse.json({ datasets });
}