import re
from typing import List, Dict, Any

class EntityExtractor:
    def extract(self, text: str) -> List[Dict[str, Any]]:
        # Rule-based entity extraction
        items = []
        if "Rahul Kumar" in text:
            items.append({"type": "PERSON", "value": "Rahul Kumar"})
        if "Sector 18" in text:
            items.append({"type": "LOCATION", "value": "Sector 18"})
        return items
