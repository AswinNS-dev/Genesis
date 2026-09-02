from fastapi import APIRouter
from backend.app.database.supabase_service import supabase_db

router = APIRouter(prefix="/debug", tags=["debug"])

@router.get("/data-status")
def get_data_status():
    """
    Returns the live connection status and row counts for all 9 populated Supabase tables.
    """
    return supabase_db.get_debug_data_status()
