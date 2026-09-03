import sys
import os

# Automatically add project root and backend dir to sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, "..", ".."))
_backend_dir = os.path.abspath(os.path.join(_current_dir, ".."))

for _p in [_project_root, _backend_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config.settings import settings
from backend.app.database.connection import init_db
from backend.app.api.routes import (
    auth_router, cases_router, entities_router,
    datasets_router, analysis_router, evidence_router,
    blockchain_router, reports_router, search_router,
    intelligence_router, dashboard_router, debug_router,
    audit_router
)

def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.VERSION,
        description="CrimeIntel AI Investigation Platform API",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_prefix = "/api"
    app.include_router(dashboard_router, prefix=api_prefix)
    app.include_router(cases_router, prefix=api_prefix)
    app.include_router(entities_router, prefix=api_prefix)
    app.include_router(datasets_router, prefix=api_prefix)
    app.include_router(analysis_router, prefix=api_prefix)
    app.include_router(evidence_router, prefix=api_prefix)
    app.include_router(blockchain_router, prefix=api_prefix)
    app.include_router(reports_router, prefix=api_prefix)
    app.include_router(search_router, prefix=api_prefix)
    app.include_router(intelligence_router, prefix=api_prefix)
    app.include_router(debug_router, prefix=api_prefix)
    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(audit_router, prefix=api_prefix)

    @app.on_event("startup")
    def on_startup():
        init_db()

    @app.get("/health")
    def health():
        return {"status": "healthy", "service": "CrimeIntel API", "version": settings.VERSION}

    return app

app = create_application()

if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} on http://localhost:8000")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
