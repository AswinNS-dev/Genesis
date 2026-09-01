// CrimeIntel — Report Service
// Generates structured investigation reports from actual analyzed data.

import { prisma } from "../lib/prisma";

function safeJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export class ReportService {
  /**
   * Generate a structured investigation report for a case.
   */
  async generateForCase(caseId: string, generatedBy?: string) {
    const c = await prisma.investigationCase.findUnique({
      where: { id: caseId },
      include: {
        entities: true,
        relationships: { include: { source: true, target: true } },
        events: { orderBy: { eventAt: "asc" } },
        documents: { include: { blockchainRecords: { orderBy: { index: "asc" } } } },
      },
    });
    if (!c) throw new Error("Case not found");

    // Patterns relevant to the case (matched by entity names).
    const relatedNames = new Set(c.entities.map((e) => e.name));
    const relevantPatterns = (await prisma.pattern.findMany()).filter((p) => {
      const names = safeJsonArray(p.entities);
      return names.some((n) => relatedNames.has(n));
    });
    const highSeverityCount = relevantPatterns.filter((p) => p.severity === "HIGH").length;
    const patterns = relevantPatterns
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);

    // AI alerts relevant to the case.
    const recentAlerts = await prisma.aIAlert.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    const alerts = recentAlerts
      .filter((a) => a.message && [...relatedNames].some((n) => a.message.includes(n)))
      .slice(0, 6)
      .map((a) => ({ severity: a.severity, message: a.message, createdAt: a.createdAt.toISOString() }));

    // Follow-up / attention checklist.
    const [pendingCandidates, unmatchedRecords, mergedRecords] = await Promise.all([
      prisma.extractionCandidate.count({ where: { document: { caseId: c.id }, status: "PENDING" } }),
      prisma.datasetRecord.count({ where: { dataset: { caseId: c.id }, matchStatus: "UNMATCHED" } }),
      prisma.datasetRecord.count({ where: { dataset: { caseId: c.id }, matchStatus: "MERGED" } }),
    ]);
    const attention = [
      ...(pendingCandidates ? [`${pendingCandidates} pending extraction candidate(s) awaiting review`] : []),
      ...(unmatchedRecords ? [`${unmatchedRecords} unmatched dataset record(s) awaiting matching review`] : []),
      ...(highSeverityCount ? [`${highSeverityCount} high-severity AI pattern(s) require analyst review`] : []),
      ...(mergedRecords ? [`${mergedRecords} dataset record merge(s) completed via entity matching`] : []),
    ];

    // Evidence manifest with blockchain notarization status.
    const exhibits = c.documents.map((d) => {
      const block = d.blockchainRecords[0];
      return {
        name: d.name,
        status: d.status,
        verified: d.verified,
        sha256: d.sha256,
        blockIndex: block?.index ?? null,
        blockHash: block?.hash ?? null,
      };
    });

    const firstDoc = c.documents[0];
    const block = firstDoc?.blockchainRecords?.[0];

    await prisma.auditLog.create({
      data: {
        action: "REPORT_GENERATED",
        detail: `Generated report for ${c.caseId}`,
        status: "SUCCESS",
      },
    });

    return {
      caseId: c.caseId,
      title: c.title,
      status: c.status,
      classification: c.classification,
      assignedInvestigator: c.assignedInvestigator,
      description: c.description,
      generatedAt: new Date().toISOString(),
      generatedBy,
      entities: c.entities.map((e) => ({ name: e.name, type: e.type, value: e.value })),
      relationships: c.relationships.map((r) => ({
        a: r.source.name,
        b: r.target.name,
        type: r.type,
        strength: r.strength,
        count: r.count,
        records: safeJsonArray(r.records),
      })),
      events: c.events.map((e) => ({ summary: e.summary, eventAt: e.eventAt.toISOString(), type: e.type })),
      patterns: patterns.map((p) => ({ title: p.title, severity: p.severity, summary: p.summary, relevance: p.relevance })),
      alerts,
      exhibits,
      attention,
      crypto: {
        storedHash: firstDoc?.sha256 ?? "n/a",
        blockIndex: block?.index ?? null,
        verified: firstDoc?.verified ?? false,
      },
      audit: [
        `Case created: ${c.caseId}`,
        `Assigned investigator: ${c.assignedInvestigator ?? "unassigned"}`,
        "Evidence notarized on prototype blockchain ledger",
        `Report generated at ${new Date().toISOString()}`,
        "AI outputs marked as investigative leads requiring verification",
      ],
    };
  }
}

export const reportService = new ReportService();