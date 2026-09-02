import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { entityResolutionService } from "@backend/services/entity-resolution.service";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawRecords = body.records;

    if (Array.isArray(rawRecords) && rawRecords.length > 0) {
      const result = await entityResolutionService.resolveRecords(rawRecords, body.source || "MANUAL_INPUT");
      return NextResponse.json(result);
    }

    // Default: Pull active entities from database to form police records
    const dbEntities = await prisma.entity.findMany({
      include: {
        case: { select: { id: true, caseId: true, title: true } },
      },
      take: 50,
    });

    const mappedRecords = dbEntities.map((e) => {
      let meta: Record<string, any> = {};
      try {
        meta = e.metadata ? JSON.parse(e.metadata) : {};
      } catch {
        meta = {};
      }

      let aliases: string[] = [];
      try {
        aliases = e.aliases ? JSON.parse(e.aliases) : [];
      } catch {
        aliases = [];
      }

      return {
        id: e.id,
        name: e.name,
        aliases,
        phone: e.type === "PHONE" ? e.name : meta.phone || null,
        dob: meta.dob || null,
        address: meta.address || null,
        city: meta.city || null,
        vehicleNo: e.type === "VEHICLE" ? e.name : meta.vehicleNo || null,
        caseId: e.caseId,
        source: "SUPABASE_ENTITY_REGISTRY",
      };
    });

    const result = await entityResolutionService.resolveRecords(mappedRecords, "DATABASE_REGISTRY");
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Entity resolution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
