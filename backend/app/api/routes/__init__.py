from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.cases import router as cases_router
from backend.app.api.routes.entities import router as entities_router
from backend.app.api.routes.datasets import router as datasets_router
from backend.app.api.routes.analysis import router as analysis_router
from backend.app.api.routes.evidence import router as evidence_router
from backend.app.api.routes.blockchain import router as blockchain_router
from backend.app.api.routes.reports import router as reports_router
from backend.app.api.routes.search import router as search_router
from backend.app.api.routes.intelligence import router as intelligence_router

__all__ = [
    "auth_router", "cases_router", "entities_router",
    "datasets_router", "analysis_router", "evidence_router",
    "blockchain_router", "reports_router", "search_router",
    "intelligence_router"
]
