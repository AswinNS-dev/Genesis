from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.api.controllers.analysis_controller import AnalysisController
from backend.app.graph.pathfinding import find_shortest_paths
from backend.app.graph.builder import NetworkGraphBuilder
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

@router.post("/temporal")
def post_temporal_anomalies(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    service = TemporalService(db)
    case_id = payload.get("caseId")
    if not case_id:
        raise HTTPException(status_code=400, detail="Missing required field 'caseId'")
    try:
        return service.detect_temporal_anomalies(
            case_id=case_id,
            crime_timestamp=payload.get("crimeTimestamp"),
            before_window_minutes=payload.get("beforeWindowMinutes", 120),
            after_window_minutes=payload.get("afterWindowMinutes", 120),
            baseline_days=payload.get("baselineDays", 30)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
