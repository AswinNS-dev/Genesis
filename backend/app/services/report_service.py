from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.reports.generator import ReportGenerator

class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.generator = ReportGenerator()

    def generate_report(self, case_id: str) -> Dict[str, Any]:
        return self.generator.generate_report(self.db, case_id)
