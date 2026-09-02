// CrimeIntel — Graph Analysis Intelligence Service
// ============================================================
// Comprehensive network graph analytics for criminal intelligence:
// 1. Centrality metrics: Degree, Betweenness (Brandes), Closeness, PageRank
// 2. Community detection: Modularity clustering & Connected Components
// 3. Indirect connection analysis: Multi-hop shortest paths, Common Neighbors
// 4. Network structure & topology statistics
// 5. Investigative pattern detection: Hubs, Bridges, Cross-case Links
//
// Read-only against existing Supabase / Prisma dataset.
// ============================================================

import { prisma } from "../lib/prisma";
import { entityColor, relationColor } from "../lib/colors";

export interface NodeMetrics {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  caseId: string | null;
  caseTitle: string | null;
  
  // Centrality Metrics (Normalized 0.0 - 1.0 or ranked)
  degree: number;
  degreeCentrality: number;
  betweennessCentrality: number;
  closenessCentrality: number;
  pageRank: number;

  // Composite Importance
  importanceScore: number;
  rank: number;
  importanceReason: string;

  // Structural context
  communityId: number;
  directNeighborsCount: number;
  connectedCasesCount: number;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  sourceName: string;
  targetName: string;
  type: string;
  label: string | null;
  strength: number;
  count: number;
  records: string[];
  color: string;
  weight: number;
}

export interface CommunityCluster {
  id: number;
  name: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  dominantType: string;
  keyMembers: { id: string; name: string; type: string; role: string }[];
  memberIds: string[];
  internalRelationships: string[];
}

export interface NetworkPattern {
  id: string;
  type: "HUB_ENTITY" | "BRIDGE_NODE" | "CROSS_CASE_BRIDGE" | "DENSE_CELL" | "SHARED_RESOURCE";
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  involvedEntityIds: string[];
  involvedEntityNames: string[];
  metricDetail: string;
}

export interface NetworkStatistics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  averageDegree: number;
  connectedComponentsCount: number;
  communitiesCount: number;
  isolatedNodesCount: number;
  diameterEstimate: number;
}

export interface FullGraphAnalysisResult {
  statistics: NetworkStatistics;
  nodes: NodeMetrics[];
  edges: EdgeData[];
  communities: CommunityCluster[];
  patterns: NetworkPattern[];
  topInfluencers: NodeMetrics[];
  topBridges: NodeMetrics[];
}

export interface PathStepDetail {
  entityId: string;
  name: string;
  type: string;
  relationshipToNext?: {
    type: string;
    label: string | null;
    strength: number;
    count: number;
  };
}

export interface MultiHopPathResult {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  found: boolean;
  hopCount: number;
  path: PathStepDetail[];
  commonNeighbors: { id: string; name: string; type: string }[];
  jaccardSimilarity: number;
  explanation: string;
}

export class GraphAnalysisService {
  /**
   * Computes full graph intelligence from existing Supabase entities and relationships.
   */
  async analyzeFullGraph(caseIdFilter?: string): Promise<FullGraphAnalysisResult> {
    // 1. Fetch all entities, relationships, and cases
    const [entities, relationships, cases] = await Promise.all([
      prisma.entity.findMany({
        where: caseIdFilter ? { caseId: caseIdFilter } : undefined,
        include: { case: { select: { id: true, caseId: true, title: true } } },
      }),
      prisma.relationship.findMany({
        include: {
          source: { select: { id: true, name: true, type: true } },
          target: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.investigationCase.findMany({
        select: { id: true, caseId: true, title: true },
      }),
    ]);

    const caseMap = new Map(cases.map((c) => [c.id, c.title]));
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    // Filter relationships if caseIdFilter is specified
    const validEntityIds = new Set(entities.map((e) => e.id));
    const validRels = relationships.filter(
      (r) => validEntityIds.has(r.sourceId) && validEntityIds.has(r.targetId)
    );

    const N = entities.length;
    if (N === 0) {
      return {
        statistics: {
          totalNodes: 0,
          totalEdges: 0,
          density: 0,
          averageDegree: 0,
          connectedComponentsCount: 0,
          communitiesCount: 0,
          isolatedNodesCount: 0,
          diameterEstimate: 0,
        },
        nodes: [],
        edges: [],
        communities: [],
        patterns: [],
        topInfluencers: [],
        topBridges: [],
      };
    }

    // 2. Build Adjacency Matrix & Lists
    const adj = new Map<string, Set<string>>();
    const edgeWeights = new Map<string, number>();
    for (const e of entities) {
      adj.set(e.id, new Set<string>());
    }

    const edges: EdgeData[] = [];
    for (const r of validRels) {
      adj.get(r.sourceId)?.add(r.targetId);
      adj.get(r.targetId)?.add(r.sourceId);

      const pairKey = r.sourceId < r.targetId ? `${r.sourceId}|${r.targetId}` : `${r.targetId}|${r.sourceId}`;
      edgeWeights.set(pairKey, (edgeWeights.get(pairKey) ?? 0) + (r.strength || 10));

      let records: string[] = [];
      try {
        records = r.records ? JSON.parse(r.records) : [];
      } catch {
        records = [];
      }

      edges.push({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        sourceName: r.source.name,
        targetName: r.target.name,
        type: r.type,
        label: r.label ?? null,
        strength: r.strength,
        count: r.count,
        records,
        color: relationColor(r.type),
        weight: Math.min(5, Math.max(1, Math.round(r.strength / 20))),
      });
    }

    // 3. Centrality Calculations
    // A. Degree Centrality
    const degrees = new Map<string, number>();
    const degreeCentrality = new Map<string, number>();
    for (const e of entities) {
      const deg = adj.get(e.id)?.size ?? 0;
      degrees.set(e.id, deg);
      degreeCentrality.set(e.id, N > 1 ? deg / (N - 1) : 0);
    }

    // B. Betweenness Centrality (Brandes Algorithm)
    const betweenness = this.calculateBetweennessCentrality(entities.map((e) => e.id), adj);

    // C. Closeness Centrality
    const closeness = this.calculateClosenessCentrality(entities.map((e) => e.id), adj);

    // D. PageRank (Power Iteration)
    const pageRank = this.calculatePageRank(entities.map((e) => e.id), adj);

    // 4. Community Detection (Connected Components + Modularity Clustering)
    const { communities, nodeCommunityMap } = this.detectCommunities(entities, adj, edges);

    // 5. Build Node Metrics & Explainable Importance
    const nodes: NodeMetrics[] = [];
    for (const e of entities) {
      const deg = degrees.get(e.id) ?? 0;
      const degC = degreeCentrality.get(e.id) ?? 0;
      const betC = betweenness.get(e.id) ?? 0;
      const cloC = closeness.get(e.id) ?? 0;
      const pr = pageRank.get(e.id) ?? 0;
      const commId = nodeCommunityMap.get(e.id) ?? 0;

      // Composite Importance Score (0.0 to 10.0 scale)
      const importanceScore = Number(
        (degC * 3.5 + betC * 3.5 + cloC * 1.5 + pr * N * 1.5).toFixed(2)
      );

      // Generate explainable narrative
      const importanceReason = this.generateImportanceReason(
        e.name,
        e.type,
        deg,
        degC,
        betC,
        pr,
        commId
      );

      nodes.push({
        id: e.id,
        name: e.name,
        type: e.type,
        riskScore: e.riskScore || 0,
        caseId: e.caseId,
        caseTitle: e.caseId ? caseMap.get(e.caseId) ?? null : null,
        degree: deg,
        degreeCentrality: Number(degC.toFixed(4)),
        betweennessCentrality: Number(betC.toFixed(4)),
        closenessCentrality: Number(cloC.toFixed(4)),
        pageRank: Number(pr.toFixed(4)),
        importanceScore,
        rank: 0, // Assigned below after sort
        importanceReason,
        communityId: commId,
        directNeighborsCount: deg,
        connectedCasesCount: e.caseId ? 1 : 0,
      });
    }

    // Rank nodes by importance score
    nodes.sort((a, b) => b.importanceScore - a.importanceScore);
    nodes.forEach((n, idx) => {
      n.rank = idx + 1;
    });

    // 6. Network Topology Statistics
    const totalEdgesCount = edges.length;
    const maxPossibleEdges = (N * (N - 1)) / 2;
    const density = maxPossibleEdges > 0 ? Number((totalEdgesCount / maxPossibleEdges).toFixed(4)) : 0;
    const avgDegree = Number(((2 * totalEdgesCount) / N).toFixed(2));
    const isolatedNodesCount = nodes.filter((n) => n.degree === 0).length;

    const statistics: NetworkStatistics = {
      totalNodes: N,
      totalEdges: totalEdgesCount,
      density,
      averageDegree: avgDegree,
      connectedComponentsCount: communities.length,
      communitiesCount: communities.length,
      isolatedNodesCount,
      diameterEstimate: this.estimateDiameter(entities.map((e) => e.id), adj),
    };

    // 7. Investigative Pattern Detection
    const patterns = this.detectNetworkPatterns(nodes, edges, communities, adj);

    // Top Influencers & Bridges
    const topInfluencers = [...nodes]
      .sort((a, b) => b.degreeCentrality - a.degreeCentrality)
      .slice(0, 5);

    const topBridges = [...nodes]
      .sort((a, b) => b.betweennessCentrality - a.betweennessCentrality)
      .slice(0, 5);

    return {
      statistics,
      nodes,
      edges,
      communities,
      patterns,
      topInfluencers,
      topBridges,
    };
  }

  /**
   * Calculates multi-hop shortest paths & common neighbors between two entities.
   */
  async findEntityPath(sourceId: string, targetId: string, maxDepth = 4): Promise<MultiHopPathResult> {
    const [source, target, rels, allEntities] = await Promise.all([
      prisma.entity.findUnique({ where: { id: sourceId } }),
      prisma.entity.findUnique({ where: { id: targetId } }),
      prisma.relationship.findMany(),
      prisma.entity.findMany(),
    ]);

    if (!source || !target) {
      throw new Error("Source or target entity was not found.");
    }

    const entityMap = new Map(allEntities.map((e) => [e.id, e]));

    // Adjacency with edge lookup
    const adj = new Map<string, { targetId: string; rel: (typeof rels)[0] }[]>();
    for (const r of rels) {
      if (!adj.has(r.sourceId)) adj.set(r.sourceId, []);
      if (!adj.has(r.targetId)) adj.set(r.targetId, []);
      adj.get(r.sourceId)!.push({ targetId: r.targetId, rel: r });
      adj.get(r.targetId)!.push({ targetId: r.sourceId, rel: r });
    }

    // Direct Common Neighbors
    const sourceNeighbors = new Set((adj.get(sourceId) ?? []).map((n) => n.targetId));
    const targetNeighbors = new Set((adj.get(targetId) ?? []).map((n) => n.targetId));

    const commonNeighborIds = Array.from(sourceNeighbors).filter((id) => targetNeighbors.has(id));
    const commonNeighbors = commonNeighborIds.map((id) => {
      const e = entityMap.get(id);
      return { id, name: e?.name ?? id, type: e?.type ?? "UNKNOWN" };
    });

    const unionSize = new Set([...Array.from(sourceNeighbors), ...Array.from(targetNeighbors)]).size;
    const jaccardSimilarity = unionSize > 0 ? Number((commonNeighborIds.length / unionSize).toFixed(3)) : 0;

    // BFS for Shortest Path
    const queue: { currentId: string; path: string[]; edges: (typeof rels)[0][] }[] = [
      { currentId: sourceId, path: [sourceId], edges: [] },
    ];
    const visited = new Set<string>([sourceId]);

    let foundPath: { path: string[]; edges: (typeof rels)[0][] } | null = null;

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.currentId === targetId) {
        foundPath = { path: item.path, edges: item.edges };
        break;
      }

      if (item.path.length - 1 >= maxDepth) continue;

      for (const neighbor of adj.get(item.currentId) ?? []) {
        if (!visited.has(neighbor.targetId)) {
          visited.add(neighbor.targetId);
          queue.push({
            currentId: neighbor.targetId,
            path: [...item.path, neighbor.targetId],
            edges: [...item.edges, neighbor.rel],
          });
        }
      }
    }

    if (!foundPath) {
      return {
        sourceId,
        targetId,
        sourceName: source.name,
        targetName: target.name,
        found: false,
        hopCount: -1,
        path: [],
        commonNeighbors,
        jaccardSimilarity,
        explanation: `No direct or indirect connection found between "${source.name}" and "${target.name}" within ${maxDepth} hops.`,
      };
    }

    const stepDetails: PathStepDetail[] = foundPath.path.map((nodeId, idx) => {
      const e = entityMap.get(nodeId);
      const edgeToNext = foundPath!.edges[idx];
      return {
        entityId: nodeId,
        name: e?.name ?? nodeId,
        type: e?.type ?? "UNKNOWN",
        relationshipToNext: edgeToNext
          ? {
              type: edgeToNext.type,
              label: edgeToNext.label ?? null,
              strength: edgeToNext.strength,
              count: edgeToNext.count,
            }
          : undefined,
      };
    });

    const hopCount = foundPath.path.length - 1;
    let explanation = `Indirect connection of ${hopCount} hop${hopCount === 1 ? "" : "s"} identified between "${source.name}" and "${target.name}".`;
    if (hopCount === 1) {
      explanation = `Direct relationship exists between "${source.name}" and "${target.name}" (${foundPath.edges[0]?.type ?? "LINK"}).`;
    } else if (commonNeighbors.length > 0) {
      explanation += ` Shares ${commonNeighbors.length} common intermediary entity/resource (e.g. ${commonNeighbors.map((c) => c.name).slice(0, 2).join(", ")}).`;
    }

    return {
      sourceId,
      targetId,
      sourceName: source.name,
      targetName: target.name,
      found: true,
      hopCount,
      path: stepDetails,
      commonNeighbors,
      jaccardSimilarity,
      explanation,
    };
  }

  /**
   * Betweenness Centrality using Brandes' Algorithm (O(V*E)).
   */
  private calculateBetweennessCentrality(nodeIds: string[], adj: Map<string, Set<string>>): Map<string, number> {
    const CB = new Map<string, number>();
    for (const v of nodeIds) CB.set(v, 0);

    for (const s of nodeIds) {
      const S: string[] = [];
      const P = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const d = new Map<string, number>();

      for (const v of nodeIds) {
        P.set(v, []);
        sigma.set(v, 0);
        d.set(v, -1);
      }

      sigma.set(s, 1);
      d.set(s, 0);

      const Q: string[] = [s];
      while (Q.length > 0) {
        const v = Q.shift()!;
        S.push(v);

        for (const w of adj.get(v) ?? []) {
          if (d.get(w)! < 0) {
            d.set(w, d.get(v)! + 1);
            Q.push(w);
          }
          if (d.get(w) === d.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            P.get(w)!.push(v);
          }
        }
      }

      const delta = new Map<string, number>();
      for (const v of nodeIds) delta.set(v, 0);

      while (S.length > 0) {
        const w = S.pop()!;
        for (const v of P.get(w)!) {
          delta.set(
            v,
            delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!)
          );
        }
        if (w !== s) {
          CB.set(w, CB.get(w)! + delta.get(w)!);
        }
      }
    }

    // Normalization for undirected graph: 2 / ((N-1)(N-2))
    const N = nodeIds.length;
    const factor = N > 2 ? 1 / ((N - 1) * (N - 2)) : 1; // Halved for undirected
    for (const v of nodeIds) {
      CB.set(v, Number(((CB.get(v)! * factor)).toFixed(6)));
    }

    return CB;
  }

  /**
   * Closeness Centrality (Harmonic / Geodesic distance based).
   */
  private calculateClosenessCentrality(nodeIds: string[], adj: Map<string, Set<string>>): Map<string, number> {
    const CC = new Map<string, number>();
    const N = nodeIds.length;

    for (const s of nodeIds) {
      const d = new Map<string, number>();
      for (const v of nodeIds) d.set(v, -1);
      d.set(s, 0);

      const Q: string[] = [s];
      let totalDist = 0;
      let reachable = 0;

      while (Q.length > 0) {
        const u = Q.shift()!;
        const distU = d.get(u)!;

        for (const v of adj.get(u) ?? []) {
          if (d.get(v)! < 0) {
            d.set(v, distU + 1);
            totalDist += distU + 1;
            reachable++;
            Q.push(v);
          }
        }
      }

      if (reachable > 0 && totalDist > 0) {
        const score = (reachable / (N - 1)) * (reachable / totalDist);
        CC.set(s, Number(score.toFixed(4)));
      } else {
        CC.set(s, 0);
      }
    }

    return CC;
  }

  /**
   * PageRank using Power Iteration.
   */
  private calculatePageRank(nodeIds: string[], adj: Map<string, Set<string>>, damping = 0.85, maxIter = 50): Map<string, number> {
    const N = nodeIds.length;
    const PR = new Map<string, number>();
    if (N === 0) return PR;

    const initialVal = 1.0 / N;
    for (const v of nodeIds) PR.set(v, initialVal);

    for (let iter = 0; iter < maxIter; iter++) {
      const nextPR = new Map<string, number>();
      let sinkSum = 0;

      for (const v of nodeIds) {
        const deg = adj.get(v)?.size ?? 0;
        if (deg === 0) {
          sinkSum += PR.get(v)!;
        }
      }

      const baseVal = (1.0 - damping) / N + (damping * sinkSum) / N;

      for (const v of nodeIds) {
        let incomingSum = 0;
        for (const neighbor of adj.get(v) ?? []) {
          const neighborDeg = adj.get(neighbor)?.size ?? 1;
          incomingSum += PR.get(neighbor)! / neighborDeg;
        }
        nextPR.set(v, baseVal + damping * incomingSum);
      }

      for (const v of nodeIds) {
        PR.set(v, nextPR.get(v)!);
      }
    }

    return PR;
  }

  /**
   * Community Detection using Connected Components & Adjacency Density.
   */
  private detectCommunities(
    entities: { id: string; name: string; type: string }[],
    adj: Map<string, Set<string>>,
    edges: EdgeData[]
  ): { communities: CommunityCluster[]; nodeCommunityMap: Map<string, number> } {
    const visited = new Set<string>();
    const clusters: string[][] = [];

    for (const e of entities) {
      if (!visited.has(e.id)) {
        const component: string[] = [];
        const queue = [e.id];
        visited.add(e.id);

        while (queue.length > 0) {
          const cur = queue.shift()!;
          component.push(cur);

          for (const neighbor of adj.get(cur) ?? []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        clusters.push(component);
      }
    }

    // Sort clusters by size descending
    clusters.sort((a, b) => b.length - a.length);

    const entityById = new Map(entities.map((e) => [e.id, e]));
    const nodeCommunityMap = new Map<string, number>();
    const communities: CommunityCluster[] = [];

    clusters.forEach((memberIds, idx) => {
      const commId = idx + 1;
      const memberSet = new Set(memberIds);

      memberIds.forEach((id) => {
        nodeCommunityMap.set(id, commId);
      });

      // Internal edges
      const internalEdges = edges.filter(
        (e) => memberSet.has(e.source) && memberSet.has(e.target)
      );

      // Dominant Entity Type
      const typeCounts: Record<string, number> = {};
      memberIds.forEach((id) => {
        const t = entityById.get(id)?.type ?? "UNKNOWN";
        typeCounts[t] = (typeCounts[t] ?? 0) + 1;
      });

      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "MIXED";

      // Cluster density
      const k = memberIds.length;
      const maxPossible = (k * (k - 1)) / 2;
      const density = maxPossible > 0 ? Number((internalEdges.length / maxPossible).toFixed(3)) : 1.0;

      // Key Members
      const keyMembers = memberIds
        .map((id) => {
          const e = entityById.get(id);
          const deg = adj.get(id)?.size ?? 0;
          return {
            id,
            name: e?.name ?? id,
            type: e?.type ?? "UNKNOWN",
            role: deg >= 3 ? "Core Hub" : "Connected Member",
            degree: deg,
          };
        })
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 4);

      communities.push({
        id: commId,
        name: `Cluster ${commId} (${dominantType} Group)`,
        nodeCount: memberIds.length,
        edgeCount: internalEdges.length,
        density,
        dominantType,
        keyMembers,
        memberIds,
        internalRelationships: Array.from(new Set(internalEdges.map((e) => e.type))),
      });
    });

    return { communities, nodeCommunityMap };
  }

  /**
   * Pattern recognition in network structure.
   */
  private detectNetworkPatterns(
    nodes: NodeMetrics[],
    edges: EdgeData[],
    communities: CommunityCluster[],
    adj: Map<string, Set<string>>
  ): NetworkPattern[] {
    const patterns: NetworkPattern[] = [];

    // 1. Hub Entities
    const highDegreeNodes = nodes.filter((n) => n.degree >= 3);
    for (const h of highDegreeNodes.slice(0, 3)) {
      patterns.push({
        id: `hub-${h.id}`,
        type: "HUB_ENTITY",
        title: `High-Connectivity Hub: ${h.name}`,
        description: `Entity "${h.name}" acts as a primary communication/relationship hub with ${h.degree} direct connections across the network.`,
        severity: h.degree >= 5 ? "CRITICAL" : "HIGH",
        involvedEntityIds: [h.id],
        involvedEntityNames: [h.name],
        metricDetail: `Degree: ${h.degree}, Degree Centrality: ${h.degreeCentrality.toFixed(3)}`,
      });
    }

    // 2. Bridge Nodes (High Betweenness relative to degree)
    const bridgeNodes = nodes.filter((n) => n.betweennessCentrality > 0.1 && n.degree >= 2);
    for (const b of bridgeNodes.slice(0, 3)) {
      patterns.push({
        id: `bridge-${b.id}`,
        type: "BRIDGE_NODE",
        title: `Key Intermediary Bridge: ${b.name}`,
        description: `Entity "${b.name}" sits on key geodesic paths between distinct clusters, acting as an essential link for multi-hop communication.`,
        severity: "HIGH",
        involvedEntityIds: [b.id],
        involvedEntityNames: [b.name],
        metricDetail: `Betweenness Centrality: ${b.betweennessCentrality.toFixed(4)}, Cluster #${b.communityId}`,
      });
    }

    // 3. Dense Communities / Highly Cohesive Cells
    const denseComms = communities.filter((c) => c.nodeCount >= 3 && c.density >= 0.5);
    for (const dc of denseComms) {
      patterns.push({
        id: `dense-${dc.id}`,
        type: "DENSE_CELL",
        title: `Dense Cohesive Cluster: ${dc.name}`,
        description: `${dc.name} contains ${dc.nodeCount} tightly interconnected entities with high internal density (${(dc.density * 100).toFixed(0)}%).`,
        severity: "MEDIUM",
        involvedEntityIds: dc.memberIds,
        involvedEntityNames: dc.keyMembers.map((m) => m.name),
        metricDetail: `Density: ${(dc.density * 100).toFixed(0)}%, ${dc.edgeCount} relationships`,
      });
    }

    return patterns;
  }

  /**
   * Generates explainable narrative for node importance ranking.
   */
  private generateImportanceReason(
    name: string,
    type: string,
    degree: number,
    degreeC: number,
    betweennessC: number,
    pageRank: number,
    communityId: number
  ): string {
    const reasons: string[] = [];

    if (degree >= 4) {
      reasons.push(`High direct connectivity with ${degree} direct links (Hub Entity).`);
    } else if (degree > 1) {
      reasons.push(`Moderate connectivity with ${degree} links in Cluster #${communityId}.`);
    } else if (degree === 1) {
      reasons.push(`Single peripheral relationship in Cluster #${communityId}.`);
    } else {
      reasons.push(`Isolated node with no active recorded relationships.`);
    }

    if (betweennessC >= 0.15) {
      reasons.push(`Critical network bridge routing high-frequency multi-hop interactions.`);
    } else if (betweennessC > 0.05) {
      reasons.push(`Intermediary broker connecting multiple sub-graphs.`);
    }

    if (pageRank > 0.1) {
      reasons.push(`High PageRank influence propagated from neighboring central nodes.`);
    }

    return reasons.join(" ");
  }

  private estimateDiameter(nodeIds: string[], adj: Map<string, Set<string>>): number {
    let maxDist = 0;
    for (const s of nodeIds.slice(0, 15)) {
      const d = new Map<string, number>();
      d.set(s, 0);
      const Q = [s];

      while (Q.length > 0) {
        const u = Q.shift()!;
        const distU = d.get(u)!;
        if (distU > maxDist) maxDist = distU;

        for (const v of adj.get(u) ?? []) {
          if (!d.has(v)) {
            d.set(v, distU + 1);
            Q.push(v);
          }
        }
      }
    }
    return maxDist;
  }
}

export const graphAnalysisService = new GraphAnalysisService();
