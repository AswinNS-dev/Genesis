import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { verifyChain, hashBlock, genesisDataHash, genesisTimestamp } from "@backend/lib/blockchain";

export const dynamic = "force-dynamic";

// Verify the entire prototype blockchain ledger chain.
export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await prisma.blockchainRecord.findMany({ orderBy: { index: "asc" } });

  // Build blocks including the virtual genesis block.
  const genesis = {
    index: 0,
    timestamp: genesisTimestamp(),
    dataHash: genesisDataHash(),
    previousHash: "0".repeat(64),
    action: "GENESIS",
  };
  const genesisHash = hashBlock(genesis);

  const blocksForVerify = records.map((r) => ({
    id: r.id,
    index: r.index,
    timestamp: r.timestamp,
    dataHash: r.dataHash,
    previousHash: r.previousHash,
    hash: r.hash,
    action: r.action ?? undefined,
  }));

  // Check genesis linkage: first block should chain from genesis.
  const first = records[0];
  const genesisLinked = !first || first.previousHash === genesisHash;

  const chain = verifyChain(blocksForVerify);
  const intact = chain.intact && genesisLinked;

  return NextResponse.json({
    intact,
    chainIntact: chain.intact,
    genesisLinked,
    brokenIndex: chain.brokenIndex,
    totalBlocks: records.length,
  });
}
