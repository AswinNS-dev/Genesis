from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user
from backend.app.api.controllers.analysis_controller import AnalysisController
from backend.app.graph.pathfinding import find_shortest_paths
from backend.app.graph.builder import NetworkGraphBuilder

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/case/{case_id}")
def analyze_case_endpoint(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ctrl = AnalysisController(db)
    try:
        return ctrl.analyze_case(case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/graph")
def get_graph_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    builder = NetworkGraphBuilder()
    return builder.build_network(db)

@router.get("/path")
def find_path_endpoint(
    source: str = Query(...),
    target: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return find_shortest_paths(db, source, target)
