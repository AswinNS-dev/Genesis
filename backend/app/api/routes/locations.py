from fastapi import APIRouter, Query, Depends
from typing import Optional, Dict, Any, List
from backend.app.services.location_analysis_service import location_service

router = APIRouter(prefix="/locations", tags=["locations"])

@router.get("/hierarchy")
def get_geographic_hierarchy():
    """
    Returns available geographic hierarchy for India: States, Districts, and Sub-district areas.
    """
    return location_service.get_geographic_hierarchy()

@router.get("/cases-with-incidents")
def get_cases_with_incidents(limit: int = Query(100, ge=1, le=500)):
    """
    Returns cases with incident dates to facilitate incident-date comparative analysis.
    """
    return location_service.get_cases_with_incidents(limit=limit)

@router.get("/hotspots")
def get_location_hotspots(
    level: str = Query("india", description="Geographic hierarchy level: india | state | district | area"),
    state: Optional[str] = Query(None, description="Selected state name"),
    district: Optional[str] = Query(None, description="Selected district / city name"),
    area: Optional[str] = Query(None, description="Selected sub-district / local area name"),
    category: str = Query("ALL", description="Activity category: ALL | COMMUNICATION | FINANCIAL | VEHICLE | CASE | LOCATION"),
    time_range: str = Query("all", description="Temporal filter: 7d | 30d | 6m | custom | all"),
    date_from: Optional[str] = Query(None, description="Start date for custom filter (ISO string)"),
    date_to: Optional[str] = Query(None, description="End date for custom filter (ISO string)"),
    case_id: Optional[str] = Query(None, description="Optional case ID for incident-date comparison"),
    incident_window: int = Query(3, description="Incident-date comparison window in days (+/- 1, 3, 7)")
) -> Dict[str, Any]:
    """
    Retrieves investigation hotspot clusters, heatmap coordinates, and data quality metrics
    filtered by geographic hierarchy, category, and date ranges.
    """
    return location_service.get_hotspots(
        level=level,
        state=state,
        district=district,
        area=area,
        category=category,
        time_range=time_range,
        date_from=date_from,
        date_to=date_to,
        case_id=case_id,
        incident_window=incident_window
    )
