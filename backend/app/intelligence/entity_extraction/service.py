import re
from typing import List, Optional
from backend.app.intelligence.entity_extraction.base import BaseExtractionEngine, ExtractionItem

PEOPLE = ["Rahul Kumar", "Amit Sharma", "Suresh Verma", "Priya Singh", "Arjun Mehta"]
PHONES = ["9876512345", "9822013345", "9988776655", "9811223344"]
VEHICLES = ["DL01AB1234", "KA05XY6789", "MH12CD5678"]
LOCATIONS = ["Sector 18", "Central Market", "Industrial Area", "Vasant Vihar"]
ORGANIZATIONS = ["ABC Logistics", "Sharma Pharma", "Mehta Imports"]

class RuleBasedExtractionService(BaseExtractionEngine):
    def extract(self, text: str, hints: Optional[List[str]] = None) -> List[ExtractionItem]:
        results = []
        cands = hints if hints else PEOPLE
        for p in cands:
            if p.lower() in text.lower():
                results.append(ExtractionItem(type="PERSON", value=p, context=text[:60] + "...", confidence=90))
        for ph in PHONES:
            if ph in re.sub(r"\D", "", text):
                results.append(ExtractionItem(type="PHONE", value=ph, confidence=95))
        for v in VEHICLES:
            if v.lower() in text.lower():
                results.append(ExtractionItem(type="VEHICLE", value=v, confidence=92))
        for loc in LOCATIONS:
            if loc.lower() in text.lower():
                results.append(ExtractionItem(type="LOCATION", value=loc, confidence=88))
        for org in ORGANIZATIONS:
            if org.lower() in text.lower():
                results.append(ExtractionItem(type="ORGANIZATION", value=org, confidence=85))
        return results
