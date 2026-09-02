from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.dashboard_repository import DashboardRepository

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    repo = DashboardRepository(db)
    return repo.get_summary()
