from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.supabase_service import supabase_db
from backend.app.database.models import AIAlert, BlockchainRecord, Dataset, DatasetRecord, Entity, InvestigationCase, Pattern, Relationship, User
from backend.app.security.rbac import get_current_user
from backend.app.api.controllers.analysis_controller import AnalysisController
from backend.app.graph.pathfinding import find_shortest_paths
from backend.app.graph.builder import NetworkGraphBuilder
from backend.app.services.graph_analysis_service import GraphAnalysisService
from backend.app.services.temporal_service import TemporalService
from backend.app.blockchain.verification import verify_blockchain_chain

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _supabase_temporal_analysis(case_id: str, crime_timestamp: Optional[str], before_minutes: int, after_minutes: int) -> Dict[str, Any]:
    case = supabase_db.get_case_by_id(case_id)
    if not case:
        raise ValueError(f"Investigation case '{case_id}' was not found.")

    reference = crime_timestamp or case.get("incidentDate") or case.get("createdAt")
    if not reference:
        raise ValueError("The selected case has no reference timestamp.")
    crime_dt = datetime.fromisoformat(str(reference).replace("Z", "+00:00"))
    before_minutes = max(5, min(10080, int(before_minutes)))
    after_minutes = max(5, min(10080, int(after_minutes)))
    start = crime_dt.timestamp() - before_minutes * 60
    end = crime_dt.timestamp() + after_minutes * 60
    raw_events = []
    for item in supabase_db.get_case_communications(case_id, limit=200):
        raw_events.append((item.get("timestamp"), "COMMUNICATION", item.get("caller"), item))
    for item in supabase_db.get_case_transactions(case_id, limit=200):
        raw_events.append((item.get("timestamp"), "TRANSACTION", item.get("sender"), item))
    for item in supabase_db.get_case_locations(case_id, limit=200):
        raw_events.append((item.get("firstSeen"), "LOCATION", item.get("subjectName"), item))

    timeline = []
    counts: Dict[str, int] = {}
    for timestamp, event_type, entity_name, item in raw_events:
        if not timestamp:
            continue
        event_dt = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
        if start <= event_dt.timestamp() <= end:
            entity = entity_name or "Unassigned"
            counts[entity] = counts.get(entity, 0) + 1
            timeline.append({
                "id": item.get("id"), "type": event_type,
                "summary": f"{event_type.title()} involving {entity}",
                "detail": item, "eventAt": event_dt.isoformat(),
                "entityName": entity,
                "timing": "BEFORE" if event_dt < crime_dt else "AFTER",
                "minutesFromCrime": int((event_dt - crime_dt).total_seconds() / 60),
            })

    anomalies = [{
        "entityName": entity, "beforeActivityCount": 0,
        "afterActivityCount": count, "totalWindowActivity": count,
        "overallTemporalScore": float(min(5, count)),
        "anomalyLevel": "HIGH" if count >= 3 else "LOW",
        "baselineStatus": "NO_HISTORICAL_ACTIVITY",
        "confidence": "LOW",
        "reason": "Live Supabase event density in the selected temporal window; investigator review required.",
        "evidenceActivities": [event for event in timeline if event["entityName"] == entity],
    } for entity, count in counts.items()]
    return {
        "crime": {"id": case.get("id"), "caseId": case.get("caseId"), "title": case.get("title"), "referenceTimestamp": crime_dt.isoformat()},
        "window": {"beforeMinutes": before_minutes, "afterMinutes": after_minutes},
        "statistics": {"totalWindowActivities": len(timeline), "beforeActivitiesCount": sum(1 for e in timeline if e["timing"] == "BEFORE"), "afterActivitiesCount": sum(1 for e in timeline if e["timing"] == "AFTER"), "anomalousEntitiesCount": sum(1 for a in anomalies if a["anomalyLevel"] == "HIGH")},
        "anomalies": sorted(anomalies, key=lambda item: item["overallTemporalScore"], reverse=True),
        "timeline": sorted(timeline, key=lambda item: item["eventAt"], reverse=True),
        "summary": {"overview": "Temporal activity analysis calculated from live Supabase case events.", "disclaimer": "Investigative signal only; this result does not imply culpability."},
    }


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
def temporal_anomaly_endpoint(
    caseId: str = Query(None),
    crimeTimestamp: str = Query(None),
    beforeWindowMinutes: int = Query(120),
    afterWindowMinutes: int = Query(120),
    baselineDays: int = Query(30),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not caseId:
        raise HTTPException(status_code=400, detail="caseId is required")
    try:
        service = TemporalService(db)
        crime_dt = datetime.fromisoformat(crimeTimestamp.replace("Z", "+00:00")) if crimeTimestamp else None
        return service.detect_temporal_anomalies(
            case_id=caseId,
            crime_timestamp=crime_dt,
            before_window_minutes=beforeWindowMinutes,
            after_window_minutes=afterWindowMinutes,
            baseline_days=baselineDays
        )
    except ValueError:
        try:
            return _supabase_temporal_analysis(caseId, crimeTimestamp, beforeWindowMinutes, afterWindowMinutes)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
@router.post("/temporal")
def post_temporal_anomalies(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    case_id = payload.get("caseId")
    if not case_id:
        raise HTTPException(status_code=400, detail="Missing required field 'caseId'")
    try:
        crime_timestamp = payload.get("crimeTimestamp")
        crime_dt = datetime.fromisoformat(str(crime_timestamp).replace("Z", "+00:00")) if crime_timestamp else None
        return TemporalService(db).detect_temporal_anomalies(
            case_id=case_id,
            crime_timestamp=crime_dt,
            before_window_minutes=payload.get("beforeWindowMinutes", 120),
            after_window_minutes=payload.get("afterWindowMinutes", 120),
            baseline_days=payload.get("baselineDays", 30)
        )
    except ValueError:
        try:
            return _supabase_temporal_analysis(case_id, crime_timestamp, payload.get("beforeWindowMinutes", 120), payload.get("afterWindowMinutes", 120))
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
