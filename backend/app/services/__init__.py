try:
    from backend.app.services.case_service import CaseService
    from backend.app.services.entity_service import EntityService
    from backend.app.services.dataset_service import DatasetService
    from backend.app.services.analysis_service import AnalysisService
    from backend.app.services.evidence_service import EvidenceService
    from backend.app.services.report_service import ReportService
except ImportError:
    CaseService = None
    EntityService = None
    DatasetService = None
    AnalysisService = None
    EvidenceService = None
    ReportService = None

from backend.app.services.validation_service import validation_service, ValidationService
from backend.app.services.entity_resolution_service import entity_resolution_service, EntityResolutionService

__all__ = [
    "CaseService",
    "EntityService",
    "DatasetService",
    "AnalysisService",
    "EvidenceService",
    "ReportService",
    "validation_service",
    "ValidationService",
    "entity_resolution_service",
    "EntityResolutionService",
]
