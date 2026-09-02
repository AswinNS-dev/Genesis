from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import (
    User, InvestigationCase, Entity, Relationship,
    BlockchainRecord, AIAlert, Pattern, Dataset, DatasetRecord
)
from backend.app.security.rbac import get_current_user
from backend.app.api.controllers.analysis_controller import AnalysisController
from backend.app.graph.pathfinding import find_shortest_paths
from backend.app.graph.builder import NetworkGraphBuilder
from backend.app.blockchain.verification import verify_blockchain_chain

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
    caseId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    builder = NetworkGraphBuilder()
    if caseId:
        # Filter by case
        from backend.app.database.models import InvestigationCase as IC
        case = db.query(IC).filter(
            (IC.id == caseId) | (IC.caseId == caseId)
        ).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        # Build a scoped graph
        entities = db.query(Entity).filter(Entity.caseId == case.id).all()
        entity_ids = {e.id for e in entities}
        rels = db.query(Relationship).filter(
            Relationship.sourceId.in_(entity_ids) | Relationship.targetId.in_(entity_ids)
        ).all()
        return builder._build_from_data(entities, rels)
    return builder.build_network(db)


@router.get("/path")
def find_path_endpoint(
    source: str = Query(...),
    target: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return find_shortest_paths(db, source, target)


@router.get("/stats")
def get_stats_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Aggregate dashboard statistics from the database."""
    open_cases = db.query(InvestigationCase).filter(InvestigationCase.status == "OPEN").count()
    closed_cases = db.query(InvestigationCase).filter(InvestigationCase.status != "OPEN").count()
    entity_count = db.query(Entity).count()
    relationship_count = db.query(Relationship).count()
    ai_alert_count = db.query(AIAlert).count()
    pattern_count = db.query(Pattern).count()
    dataset_count = db.query(Dataset).count()
    dataset_record_count = db.query(DatasetRecord).count()

    blocks = db.query(BlockchainRecord).order_by(BlockchainRecord.index.asc()).all()
    chain_result = verify_blockchain_chain(blocks)

    entity_types = {}
    for (etype,) in db.query(Entity.type).distinct().all():
        entity_types[etype] = db.query(Entity).filter(Entity.type == etype).count()

    return {
        "openCases": open_cases,
        "closedCases": closed_cases,
        "entityCount": entity_count,
        "relationshipCount": relationship_count,
        "aiAlertCount": ai_alert_count,
        "patternCount": pattern_count,
        "datasetCount": dataset_count,
        "datasetRecordCount": dataset_record_count,
        "blockchainIntact": chain_result["intact"],
        "blockchainBlocks": len(blocks),
        "entityTypes": entity_types,
    }
