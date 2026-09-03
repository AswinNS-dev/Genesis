from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user_optional
from backend.app.api.controllers.report_controller import ReportController

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/cases")
def list_report_cases_endpoint(
    db: Session = Depends(get_db)
):
    ctrl = ReportController(db)
    return ctrl.list_cases()

@router.get("/entities/search")
def search_entities_for_dossier_endpoint(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    ctrl = ReportController(db)
    return ctrl.search_entities(q)

@router.get("/generate")
def generate_report_explicit_endpoint(
    caseId: str = Query(...),
    request: Request = None,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = ReportController(db)
    user_id = user.id if user else None
    role = user.role if user else "ANONYMOUS"
    client_ip = request.client.host if request and request.client else None
    try:
        return ctrl.generate(caseId, user_id=user_id, role=role, ip=client_ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preview")
def preview_report_endpoint(
    caseId: str = Query(...),
    db: Session = Depends(get_db)
):
    ctrl = ReportController(db)
    try:
        # Preview returns generated report directly
        return ctrl.generate(caseId)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dossier/{entity_id}")
def generate_entity_dossier_endpoint(
    entity_id: str,
    request: Request = None,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = ReportController(db)
    user_id = user.id if user else None
    role = user.role if user else "ANONYMOUS"
    client_ip = request.client.host if request and request.client else None
    try:
        return ctrl.generate_dossier(entity_id, user_id=user_id, role=role, ip=client_ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def generate_report_endpoint(
    caseId: str = Query(...),
    request: Request = None,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = ReportController(db)
    user_id = user.id if user else None
    role = user.role if user else "ANONYMOUS"
    client_ip = request.client.host if request and request.client else None
    try:
        return ctrl.generate(caseId, user_id=user_id, role=role, ip=client_ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
