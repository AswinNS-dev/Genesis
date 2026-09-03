from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.reports.generator import ReportGenerator
from backend.app.security.audit import log_action

class ReportController:
    def __init__(self, db: Session):
        self.db = db
        self.generator = ReportGenerator()

    def generate(self, case_id: str, user_id: Optional[str] = None, role: Optional[str] = None, ip: Optional[str] = None) -> Dict[str, Any]:
        report = self.generator.generate_report(self.db, case_id)
        # Record audit log
        log_action(
            db=self.db,
            action="REPORT_GENERATED",
            detail=f"Generated comprehensive investigation report for case {case_id}",
            case_id=case_id,
            user_id=user_id,
            role=role,
            ip=ip,
            resource="Report",
            resource_id=report.get("reportId"),
            severity="INFO",
            status="SUCCESS"
        )
        self.db.commit()
        return report

    def generate_dossier(self, entity_id: str, user_id: Optional[str] = None, role: Optional[str] = None, ip: Optional[str] = None) -> Dict[str, Any]:
        dossier = self.generator.generate_entity_dossier(self.db, entity_id)
        # Record audit log
        log_action(
            db=self.db,
            action="DOSSIER_VIEWED",
            detail=f"Accessed 360-degree dossier for entity {entity_id} ({dossier.get('identity', {}).get('primaryName', 'Unknown')})",
            user_id=user_id,
            role=role,
            ip=ip,
            resource="EntityDossier",
            resource_id=entity_id,
            severity="INFO",
            status="SUCCESS"
        )
        self.db.commit()
        return dossier

    def list_cases(self) -> List[Dict[str, Any]]:
        return self.generator.list_available_cases(self.db)

    def search_entities(self, query: str) -> List[Dict[str, Any]]:
        return self.generator.search_entities(self.db, query)
