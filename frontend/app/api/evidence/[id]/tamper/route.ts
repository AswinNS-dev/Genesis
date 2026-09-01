import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";
import { sha256, hashBlock } from "@backend/lib/blockchain";

export const dynamic = "force-dynamic";

// PROTOTYPE ONLY: simulate tampering with an exhibit so investigators can see
// the integrity-verification red-alert flow. In production this route would
// never exist — tampering is detected, not induced.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.evidenceDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });

  // Corrupt the stored hash (simulating an altered copy). The blockchain
  // notarized value is left untouched, so the next verification will fail.
  const tamperedHash = sha256(`TAMPERED ${doc.name} ${doc.sha256} at ${Date.now()}`);
  await prisma.evidenceDocument.update({
    where: { id: doc.id },
    data: { sha256: tamperedHash, status: "COMPROMISED", verified: false },
  });

  // Also append an integrity block noting the modification (immutable trail).
  const prev = await prisma.blockchainRecord.findFirst({ orderBy: { index: "desc" } });
  const block = {
    index: (prev ? prev.index : 1) + 1,
    timestamp: new Date(),
    dataHash: tamperedHash,
    previousHash: prev ? prev.hash : "0".repeat(64),
    action: "EVIDENCE_MODIFIED",
    note: `ALERT: ${doc.name} content altered (prototype tamper simulation)`,
  };
  const blockHash = hashBlock(block);
  await prisma.blockchainRecord.create({ data: { ...block, hash: blockHash, evidenceId: doc.id } });

  await prisma.securityAlert.create({
    data: {
      severity: "CRITICAL",
      type: "TAMPER",
      message: `Prototype tamper simulation: ${doc.name}`,
      detail: `The content hash for ${doc.name} was altered. Run Verify Evidence to see the integrity failure.`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "EVIDENCE_MODIFIED",
      detail: `${doc.name} tamper-simulated (demo)`,
      status: "FAILED",
    },
  });

  return NextResponse.json({ ok: true, tamperedHash });
}
