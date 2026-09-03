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

    # Calculate degrees
    degrees: Dict[str, int] = {}
    for e in filtered_edges:
        degrees[e["source"]] = degrees.get(e["source"], 0) + 1
        degrees[e["target"]] = degrees.get(e["target"], 0) + 1

    for n in nodes:
        n["degree"] = degrees.get(n["id"], 0)

    return {
        "nodes": nodes,
        "edges": filtered_edges,
        "totalNodes": len(nodes),
        "totalEdges": len(filtered_edges),
        "scope": "DATASET SCOPE: CONTAINS REAL INTELLIGENCE RECORDS",
        "timestamp": "2026-09-03T11:00:00Z"
    }

