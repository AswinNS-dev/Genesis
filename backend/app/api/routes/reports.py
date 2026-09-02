from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user
from backend.app.api.controllers.report_controller import ReportController

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("")
def generate_report_endpoint(
    caseId: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ctrl = ReportController(db)
    try:
        return ctrl.generate(caseId)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
