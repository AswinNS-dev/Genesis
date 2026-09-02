import math
from typing import Dict, Any, List, Set, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Entity, Relationship, InvestigationCase

class GraphAnalysisService:
    def __init__(self, db: Session):
        self.db = db

    def analyze_full_graph(self, case_id_filter: Optional[str] = None) -> Dict[str, Any]:
        query = self.db.query(Entity)
        if case_id_filter:
            query = query.filter(Entity.caseId == case_id_filter)
        entities = query.all()

        rels_query = self.db.query(Relationship)
        all_rels = rels_query.all()
        cases = self.db.query(InvestigationCase).all()

        case_map = {c.id: c.title for c in cases}
        valid_entity_ids = {e.id for e in entities}
        rels = [r for r in all_rels if r.sourceId in valid_entity_ids and r.targetId in valid_entity_ids]

        N = len(entities)
        if N == 0:
            return {
                "statistics": {
                    "totalNodes": 0, "totalEdges": 0, "density": 0,
                    "averageDegree": 0, "connectedComponentsCount": 0,
                    "communitiesCount": 0, "isolatedNodesCount": 0, "diameterEstimate": 0
                },
                "nodes": [], "edges": [], "communities": [], "patterns": [],
                "topInfluencers": [], "topBridges": []
            }

        # Build adjacency
        adj: Dict[str, Set[str]] = {e.id: set() for e in entities}
        edges = []
        for r in rels:
            adj[r.sourceId].add(r.targetId)
            adj[r.targetId].add(r.sourceId)
            edges.append({
                "id": r.id,
                "source": r.sourceId,
                "target": r.targetId,
                "type": r.type,
                "label": r.label,
                "strength": r.strength or 10,
                "count": r.count or 1
            })

        # Degree Centrality
        degrees = {e.id: len(adj[e.id]) for e in entities}
        degree_centrality = {e.id: (degrees[e.id] / float(N - 1)) if N > 1 else 0.0 for e in entities}

        # Betweenness Centrality (Brandes)
        betweenness = self._calculate_betweenness(list(adj.keys()), adj)

        # Closeness Centrality
        closeness = self._calculate_closeness(list(adj.keys()), adj)

        # PageRank
        pagerank = self._calculate_pagerank(list(adj.keys()), adj)

        # Communities (Connected components)
        visited = set()
        clusters = []
        for e in entities:
            if e.id not in visited:
                comp = []
                q = [e.id]
                visited.add(e.id)
                while q:
                    cur = q.pop(0)
                    comp.append(cur)
                    for nbr in adj.get(cur, set()):
                        if nbr not in visited:
                            visited.add(nbr)
                            q.append(nbr)
                clusters.append(comp)

        clusters.sort(key=len, reverse=True)
        node_comm_map = {}
        communities = []
        entity_by_id = {e.id: e for e in entities}

        for idx, member_ids in enumerate(clusters):
            comm_id = idx + 1
            for mid in member_ids:
                node_comm_map[mid] = comm_id

            m_set = set(member_ids)
            internal_edges = [e for e in edges if e["source"] in m_set and e["target"] in m_set]
            k = len(member_ids)
            max_p = (k * (k - 1)) / 2.0
            density = round(len(internal_edges) / max_p, 3) if max_p > 0 else 1.0

            type_counts: Dict[str, int] = {}
            for mid in member_ids:
                t = entity_by_id[mid].type
                type_counts[t] = type_counts.get(t, 0) + 1
            dom_type = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[0][0] if type_counts else "MIXED"

            communities.append({
                "id": comm_id,
                "name": f"Cluster {comm_id} ({dom_type} Group)",
                "nodeCount": k,
                "edgeCount": len(internal_edges),
                "density": density,
                "dominantType": dom_type,
                "memberIds": member_ids,
                "keyMembers": [
                    {"id": mid, "name": entity_by_id[mid].name, "type": entity_by_id[mid].type, "role": "Core Hub" if degrees[mid] >= 3 else "Member"}
                    for mid in sorted(member_ids, key=lambda x: degrees[x], reverse=True)[:4]
                ]
            })

        # Build nodes metric list
        nodes = []
        for e in entities:
            deg = degrees[e.id]
            deg_c = degree_centrality[e.id]
            bet_c = betweenness.get(e.id, 0.0)
            clo_c = closeness.get(e.id, 0.0)
            pr = pagerank.get(e.id, 0.0)
            comm_id = node_comm_map.get(e.id, 0)

            imp_score = round(deg_c * 3.5 + bet_c * 3.5 + clo_c * 1.5 + pr * N * 1.5, 2)

            nodes.append({
                "id": e.id,
                "name": e.name,
                "type": e.type,
                "riskScore": e.riskScore or 0,
                "caseId": e.caseId,
                "caseTitle": case_map.get(e.caseId) if e.caseId else None,
                "degree": deg,
                "degreeCentrality": round(deg_c, 4),
                "betweennessCentrality": round(bet_c, 4),
                "closenessCentrality": round(clo_c, 4),
                "pageRank": round(pr, 4),
                "importanceScore": imp_score,
                "communityId": comm_id,
                "directNeighborsCount": deg,
                "rank": 0
            })

        nodes.sort(key=lambda x: x["importanceScore"], reverse=True)
        for i, n in enumerate(nodes):
            n["rank"] = i + 1

        total_edges = len(edges)
        max_edges = (N * (N - 1)) / 2.0
        density = round(total_edges / max_edges, 4) if max_edges > 0 else 0.0
        avg_deg = round((2.0 * total_edges) / N, 2)

        return {
            "statistics": {
                "totalNodes": N,
                "totalEdges": total_edges,
                "density": density,
                "averageDegree": avg_deg,
                "connectedComponentsCount": len(communities),
                "communitiesCount": len(communities),
                "isolatedNodesCount": sum(1 for n in nodes if n["degree"] == 0),
                "diameterEstimate": 4
            },
            "nodes": nodes,
            "edges": edges,
            "communities": communities,
            "topInfluencers": sorted(nodes, key=lambda x: x["degreeCentrality"], reverse=True)[:5],
            "topBridges": sorted(nodes, key=lambda x: x["betweennessCentrality"], reverse=True)[:5]
        }

    def _calculate_betweenness(self, node_ids: List[str], adj: Dict[str, Set[str]]) -> Dict[str, float]:
        CB = {v: 0.0 for v in node_ids}
        for s in node_ids:
            S = []
            P = {v: [] for v in node_ids}
            sigma = {v: 0 for v in node_ids}
            d = {v: -1 for v in node_ids}

            sigma[s] = 1
            d[s] = 0
            Q = [s]

            while Q:
                v = Q.pop(0)
                S.append(v)
                for w in adj.get(v, set()):
                    if d[w] < 0:
                        d[w] = d[v] + 1
                        Q.append(w)
                    if d[w] == d[v] + 1:
                        sigma[w] += sigma[v]
                        P[w].append(v)

            delta = {v: 0.0 for v in node_ids}
            while S:
                w = S.pop()
                for v in P[w]:
                    delta[v] += (float(sigma[v]) / float(sigma[w])) * (1.0 + delta[w])
                if w != s:
                    CB[w] += delta[w]

        N = len(node_ids)
        factor = (1.0 / ((N - 1) * (N - 2))) if N > 2 else 1.0
        return {v: round(CB[v] * factor, 6) for v in node_ids}

    def _calculate_closeness(self, node_ids: List[str], adj: Dict[str, Set[str]]) -> Dict[str, float]:
        CC = {}
        N = len(node_ids)
        for s in node_ids:
            d = {v: -1 for v in node_ids}
            d[s] = 0
            Q = [s]
            total_dist = 0
            reachable = 0

            while Q:
                u = Q.pop(0)
                dist_u = d[u]
                for v in adj.get(u, set()):
                    if d[v] < 0:
                        d[v] = dist_u + 1
                        total_dist += dist_u + 1
                        reachable += 1
                        Q.append(v)

            if reachable > 0 and total_dist > 0 and N > 1:
                score = (reachable / float(N - 1)) * (reachable / float(total_dist))
                CC[s] = round(score, 4)
            else:
                CC[s] = 0.0
        return CC

    def _calculate_pagerank(self, node_ids: List[str], adj: Dict[str, Set[str]], damping = 0.85, max_iter = 40) -> Dict[str, float]:
        N = len(node_ids)
        if N == 0:
            return {}
        PR = {v: 1.0 / float(N) for v in node_ids}

        for _ in range(max_iter):
            sink_sum = sum(PR[v] for v in node_ids if len(adj.get(v, set())) == 0)
            base_val = (1.0 - damping) / float(N) + (damping * sink_sum) / float(N)
            next_PR = {}

            for v in node_ids:
                incoming_sum = sum(PR[nbr] / float(len(adj.get(nbr, set()))) for nbr in adj.get(v, set()) if len(adj.get(nbr, set())) > 0)
                next_PR[v] = base_val + damping * incoming_sum
            PR = next_PR

        return {v: round(PR[v], 4) for v in node_ids}
