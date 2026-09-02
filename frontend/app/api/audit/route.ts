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
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));
  const action = url.searchParams.get("action") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const userId = url.searchParams.get("userId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const id = url.searchParams.get("id") ?? "";

  // Single event detail
  if (id) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true, role: true } } },
    });
    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ log });
  }

  const where: Record<string, unknown> = {};
  if (action) where.action = { contains: action };
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
  ]);

  const actionTypes = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
    actionTypes: actionTypes.map((a) => a.action),
    users,
  });
}
