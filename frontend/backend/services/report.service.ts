/**
 * Report generation service.
 *
 * Generates a structured investigation report from a case's Prisma records.
 * Reports are assembled entirely in-process (no external PDF library required
 * in the prototype) and returned as a JSON object that the frontend renders.
 */

import { prisma } from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvestigationReport {
  generatedAt: string;
  generatedBy: string;
  caseId: string;
  caseTitle: string;
  status: string;
  classification: string;
  summary: string;
  subjects: {
    name: string;
    type: string;
    riskScore: number;
    aliases: string[];
  }[];
  organizations: { name: string; type: string }[];
  locations: { name: string; type: string }[];
  relationships: {
    type: string;
    source: string;
    target: string;
    count: number;
    strength: number;
  }[];
  evidence: {
    name: string;
    sha256: string | null;
    status: string;
    verified: boolean;
    uploadedAt: string;
  }[];
  notes: { body: string; author: string | null; createdAt: string }[];
  patterns: { type: string; title: string; severity: string; summary: string }[];
  timeline: { summary: string; eventAt: string; type: string }[];
  recommendation: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const reportService = {
  /**
   * Generate a full investigation report for a case.
   *
   * @param caseId     The human-readable case ID (e.g. CR-2026-1042) or DB id.
   * @param generatedBy Display name / role of the person generating the report.
   */
  async generateForCase(
    caseId: string,
    generatedBy: string
  ): Promise<InvestigationReport> {
    // Support lookup by either the DB id or the human-readable caseId field.
    const cs = await prisma.investigationCase.findFirst({
      where: { OR: [{ id: caseId }, { caseId }] },
      include: {
        entities: { orderBy: { riskScore: "desc" } },
        relationships: {
          include: {
            source: { select: { name: true } },
            target: { select: { name: true } },
          },
        },
        documents: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" }, take: 20 },
        events: { orderBy: { eventAt: "asc" } },
      },
    });

    if (!cs) throw new Error(`Case not found: ${caseId}`);

    // Fetch patterns related to the case entities.
    const entityNames = cs.entities.map((e) => e.name);
    const patterns = await prisma.pattern.findMany({
      where: entityNames.length
        ? {
            OR: entityNames.map((name) => ({
              entities: { contains: name },
            })),
          }
        : {},
      orderBy: { relevance: "desc" },
      take: 10,
    });

    // Classify entities by type.
    const subjects = cs.entities
      .filter((e) => e.type === "PERSON")
      .map((e) => ({
        name: e.name,
        type: e.type,
        riskScore: e.riskScore,
        aliases: e.aliases ? (JSON.parse(e.aliases) as string[]) : [],
      }));

    const organizations = cs.entities
      .filter((e) => e.type === "ORGANIZATION")
      .map((e) => ({ name: e.name, type: e.type }));

    const locations = cs.entities
      .filter((e) => e.type === "LOCATION")
      .map((e) => ({ name: e.name, type: e.type }));

    // Risk level.
    const maxRisk = Math.max(0, ...subjects.map((s) => s.riskScore));
    const riskLevel =
      maxRisk >= 80 ? "HIGH" : maxRisk >= 40 ? "MEDIUM" : "LOW";

    // Narrative summary.
    const summary = [
      `Investigation ${cs.caseId} (${cs.title}) is currently ${cs.status.toLowerCase()}.`,
      subjects.length
        ? `${subjects.length} subject(s) identified: ${subjects.slice(0, 3).map((s) => s.name).join(", ")}${subjects.length > 3 ? "…" : ""}.`
        : "No subjects identified yet.",
      organizations.length
        ? `${organizations.length} organisation(s) of interest.`
        : "",
      locations.length ? `${locations.length} location(s) of interest.` : "",
      cs.documents.length
        ? `${cs.documents.length} evidence document(s) collected.`
        : "",
      patterns.length
        ? `${patterns.length} behavioural pattern(s) detected (risk: ${riskLevel}).`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const recommendation =
      riskLevel === "HIGH"
        ? "URGENT: Escalate for immediate multi-agency action. Obtain interception warrants. Freeze financial assets where applicable."
        : riskLevel === "MEDIUM"
        ? "Continue enhanced surveillance. Obtain CDRs and bank statements. Cross-reference with other open cases."
        : "Standard monitoring. Document all further movements. Update case notes regularly.";

    const generatedAt = new Date().toISOString();

    // Audit.
    await prisma.auditLog.create({
      data: {
        caseId: cs.id,
        action: "REPORT_GENERATED",
        detail: `Report generated for ${cs.caseId} by ${generatedBy}`,
        status: "SUCCESS",
      },
    });

    return {
      generatedAt,
      generatedBy,
      caseId: cs.caseId,
      caseTitle: cs.title,
      status: cs.status,
      classification: cs.classification,
      summary,
      subjects,
      organizations,
      locations,
      relationships: cs.relationships.map((r) => ({
        type: r.type,
        source: r.source.name,
        target: r.target.name,
        count: r.count,
        strength: r.strength,
      })),
      evidence: cs.documents.map((d) => ({
        name: d.name,
        sha256: d.sha256,
        status: d.status,
        verified: d.verified,
        uploadedAt: d.createdAt.toISOString(),
      })),
      notes: cs.notes.map((n) => ({
        body: n.body,
        author: n.author,
        createdAt: n.createdAt.toISOString(),
      })),
      patterns: patterns.map((p) => ({
        type: p.type,
        title: p.title,
        severity: p.severity,
        summary: p.summary,
      })),
      timeline: cs.events.map((e) => ({
        summary: e.summary,
        eventAt: e.eventAt.toISOString(),
        type: e.type,
      })),
      recommendation,
    };
  },
};
