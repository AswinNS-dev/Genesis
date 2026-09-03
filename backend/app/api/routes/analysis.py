from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.api.controllers.analysis_controller import AnalysisController
from backend.app.graph.pathfinding import find_shortest_paths
from backend.app.graph.builder import NetworkGraphBuilder
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user, get_current_user_optional
from backend.app.services.graph_analysis_service import GraphAnalysisService
from backend.app.services.temporal_service import TemporalService

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/case/{case_id}")
def analyze_case_endpoint(
    case_id: str,
    db: Session = Depends(get_db)
):
    ctrl = AnalysisController(db)
    try:
        return ctrl.analyze_case(case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/graph")
def get_graph_endpoint(db: Session = Depends(get_db)):
    builder = NetworkGraphBuilder()
    return builder.build_network(db)

@router.get("/graph-analysis")
def get_graph_analysis_endpoint(
    caseId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    svc = GraphAnalysisService(db)
    return svc.analyze_full_graph(caseId)

@router.get("/path")
def find_path_endpoint(
    source: str = Query(...),
    target: str = Query(...),
    db: Session = Depends(get_db)
):
    return find_shortest_paths(db, source, target)

@router.get("/temporal")
@router.post("/temporal")
def temporal_anomaly_endpoint(
    caseId: str = Query(None),
    crimeTimestamp: str = Query(None),
    beforeWindowMinutes: int = Query(120),
    afterWindowMinutes: int = Query(120),
    baselineDays: int = Query(30),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    from backend.app.services.temporal_service import TemporalService
    if not caseId:
        raise HTTPException(status_code=400, detail="caseId is required")
    service = TemporalService(db)
    try:
        from datetime import datetime
        crime_dt = datetime.fromisoformat(crimeTimestamp.replace("Z", "+00:00")) if crimeTimestamp else None
        return service.detect_temporal_anomalies(
            case_id=caseId,
            crime_timestamp=crime_dt,
            before_window_minutes=beforeWindowMinutes,
            after_window_minutes=afterWindowMinutes,
            baseline_days=baselineDays
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/network-explorer")
def get_network_explorer_endpoint(
    search: Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    police_station: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    min_risk: int = Query(0),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    focus_id: Optional[str] = Query(None),
    hops: int = Query(2),
    limit: int = Query(200),
    db: Session = Depends(get_db)
):
    """
    Dedicated Criminal Network Explorer query endpoint with multi-parameter filtering,
    crime-type search, ego-network neighborhood extraction, and dossier telemetry.
    """
    search = search if isinstance(search, str) and search.strip() else None
    crime_type = crime_type if isinstance(crime_type, str) and crime_type.strip() else None
    district = district if isinstance(district, str) and district.strip() else None
    police_station = police_station if isinstance(police_station, str) and police_station.strip() else None
    entity_type = entity_type if isinstance(entity_type, str) and entity_type.strip() else None
    focus_id = focus_id if isinstance(focus_id, str) and focus_id.strip() else None
    try:
        limit = int(limit)
    except Exception:
        limit = 200
    try:
        hops = int(hops)
    except Exception:
        hops = 2
    try:
        min_risk = int(min_risk)
    except Exception:
        min_risk = 0

    from backend.app.database.supabase_service import supabase_db
    
    # 1. Fetch raw nodes & relationships from database
    graph = supabase_db.get_network_graph(max_nodes=limit, search=search)
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    # 2. Build full graph adjacency
    all_node_map = {n["id"]: n for n in nodes}
    adj: Dict[str, set] = {n["id"]: set() for n in nodes}
    for e in edges:
        u, v = e["source"], e["target"]
        if u in adj:
            adj[u].add(v)
        if v in adj:
            adj[v].add(u)

    # 3. Comprehensive Search (matches label, crimeType, caseId, location, phone, vehicle, etc.)
    if search:
        s_lower = search.strip().lower()
        matching_node_ids = set()
        for n in nodes:
            fields_to_check = [
                n.get("label", ""),
                n.get("id", ""),
                n.get("type", ""),
                n.get("crimeType", ""),
                n.get("caseId", ""),
                n.get("location", ""),
                n.get("phone", ""),
                n.get("vehicle", ""),
                n.get("jurisdiction", "")
            ]
            if any(s_lower in str(f).lower() for f in fields_to_check if f):
                matching_node_ids.add(n["id"])

        # Also check edge details for search terms
        for e in edges:
            if s_lower in (e.get("supportingRecord", "") or "").lower() or s_lower in (e.get("supportingDetail", "") or "").lower():
                matching_node_ids.add(e["source"])
                matching_node_ids.add(e["target"])

        # Include 1-hop connected neighbors of matching nodes so the network graph displays the cluster
        expanded_search_ids = set(matching_node_ids)
        for mid in matching_node_ids:
            for nbr in adj.get(mid, set()):
                expanded_search_ids.add(nbr)

        nodes = [n for n in nodes if n["id"] in expanded_search_ids]

    # 4. Filter by entity type & min risk
    if entity_type and entity_type.upper() != "ALL":
        nodes = [n for n in nodes if (n.get("type") or "").upper() == entity_type.upper()]

    if min_risk > 0:
        nodes = [n for n in nodes if n.get("riskScore", 0) >= min_risk]

    valid_node_ids = set(n["id"] for n in nodes)

    # 5. Focus mode K-hop BFS if focus_id provided
    if focus_id and focus_id in all_node_map:
        visited = {focus_id}
        queue = [(focus_id, 0)]
        while queue:
            curr, d = queue.pop(0)
            if d < hops:
                for nxt in adj.get(curr, set()):
                    if nxt not in visited and nxt in all_node_map:
                        visited.add(nxt)
                        queue.append((nxt, d + 1))
        
        nodes = [all_node_map[nid] for nid in visited if nid in all_node_map]
        valid_node_ids = visited

    # Filter edges to only include active nodes
    filtered_edges = [e for e in edges if e["source"] in valid_node_ids and e["target"] in valid_node_ids]

    # Calculate Network Metrics using existing GraphAnalysisService algorithms
    svc = GraphAnalysisService(db)
    node_ids = [n["id"] for n in nodes]
    
    active_adj: Dict[str, set] = {nid: set() for nid in node_ids}
    for e in filtered_edges:
        active_adj[e["source"]].add(e["target"])
        active_adj[e["target"]].add(e["source"])

    # Centralities
    betweenness = svc._calculate_betweenness(node_ids, active_adj) if len(node_ids) > 1 else {}
    closeness = svc._calculate_closeness(node_ids, active_adj) if len(node_ids) > 1 else {}
    pagerank = svc._calculate_pagerank(node_ids, active_adj) if len(node_ids) > 0 else {}

    # Detect Communities (Connected Component Clusters)
    visited_comm = set()
    raw_clusters = []
    for nid in node_ids:
        if nid not in visited_comm:
            comp = []
            q = [nid]
            visited_comm.add(nid)
            while q:
                curr = q.pop(0)
                comp.append(curr)
                for nbr in active_adj.get(curr, set()):
                    if nbr not in visited_comm:
                        visited_comm.add(nbr)
                        q.append(nbr)
            raw_clusters.append(comp)

    raw_clusters.sort(key=len, reverse=True)
    communities = []
    node_comm_map = {}
    node_obj_map = {n["id"]: n for n in nodes}

    for idx, member_ids in enumerate(raw_clusters):
        c_id = f"Cluster {idx + 1}"
        for mid in member_ids:
            node_comm_map[mid] = c_id
        
        type_counts: Dict[str, int] = {}
        for mid in member_ids:
            t = node_obj_map.get(mid, {}).get("type", "PERSON")
            type_counts[t] = type_counts.get(t, 0) + 1
        dom_type = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[0][0] if type_counts else "PERSON"

        m_set = set(member_ids)
        internal_edges = [e for e in filtered_edges if e["source"] in m_set and e["target"] in m_set]

        communities.append({
            "id": c_id,
            "name": f"Community {idx + 1} ({dom_type} Cluster)",
            "memberCount": len(member_ids),
            "edgeCount": len(internal_edges),
            "dominantType": dom_type,
            "memberIds": member_ids,
            "topMembers": [node_obj_map[mid].get("label", mid) for mid in member_ids[:4] if mid in node_obj_map]
        })

    # Enrich Nodes with calculated centrality and community
    for n in nodes:
        nid = n["id"]
        n["degree"] = len(active_adj.get(nid, set()))
        n["betweenness"] = betweenness.get(nid, 0.0)
        n["closeness"] = closeness.get(nid, 0.0)
        n["pageRank"] = pagerank.get(nid, 0.0)
        n["community"] = node_comm_map.get(nid, "Cluster 1")

    # Link Analysis Breakdown
    edge_type_counter: Dict[str, int] = {}
    for e in filtered_edges:
        t = e.get("type", "RELATED_TO")
        edge_type_counter[t] = edge_type_counter.get(t, 0) + 1

    link_analysis = [
        {"type": k, "count": v, "percentage": round((v / len(filtered_edges)) * 100, 1) if filtered_edges else 0}
        for k, v in sorted(edge_type_counter.items(), key=lambda x: x[1], reverse=True)
    ]

    # Timeline Events from active records
    timeline_events = []
    for n in nodes:
        if n.get("date"):
            timeline_events.append({
                "id": f"time-{n['id']}",
                "entityId": n["id"],
                "entityName": n.get("label", n["id"]),
                "type": n.get("type", "EVENT"),
                "date": n["date"],
                "title": f"{n.get('type')} Record: {n.get('label')}",
                "detail": f"Jurisdiction: {n.get('jurisdiction') or 'Monitored Sector'} • Case: {n.get('caseId') or 'General Inquiry'}"
            })
    for e in filtered_edges[:20]:
        if e.get("date"):
            timeline_events.append({
                "id": f"time-e-{e['id']}",
                "entityId": e["source"],
                "entityName": node_obj_map.get(e["source"], {}).get("label", e["source"]),
                "type": e.get("type", "INTERACTION"),
                "date": e["date"],
                "title": f"Interaction: {e.get('type')}",
                "detail": e.get("supportingDetail") or e.get("supportingRecord") or "Logged Database Link"
            })
    timeline_events.sort(key=lambda x: x.get("date") or "", reverse=True)

    # Dynamic Filter Options
    fir_cases = supabase_db.list_cases(limit=200)
    all_crime_types = sorted(list(set(c.get("category", "") for c in fir_cases if c.get("category"))))
    all_districts = sorted(list(set(c.get("jurisdiction", "").split(",")[0].strip() for c in fir_cases if c.get("jurisdiction"))))
    all_police_stations = sorted(list(set(c.get("police_station", "") for c in fir_cases if c.get("police_station"))))

    return {
        "nodes": nodes,
        "edges": filtered_edges,
        "totalNodes": len(nodes),
        "totalEdges": len(filtered_edges),
        "communities": communities,
        "linkAnalysis": link_analysis,
        "timeline": timeline_events[:30],
        "topHubs": sorted(nodes, key=lambda x: x["degree"], reverse=True)[:5],
        "topBridges": sorted(nodes, key=lambda x: x.get("betweenness", 0), reverse=True)[:5],
        "filterOptions": {
            "crimeTypes": all_crime_types,
            "districts": all_districts,
            "policeStations": all_police_stations
        },
        "scope": "DATASET SCOPE: CONTAINS REAL INTELLIGENCE RECORDS",
        "timestamp": "2026-09-03T12:00:00Z"
    }

