import csv
import io
from typing import List, Dict, Any

class CSVParser:
    def parse(self, content: bytes) -> List[Dict[str, Any]]:
        text = content.decode("utf-8", errors="ignore")
        reader = csv.DictReader(io.StringIO(text))
        return [dict(row) for row in reader]

class CSVDetector:
    def detect_columns(self, rows: List[Dict[str, Any]]) -> List[str]:
        if not rows:
            return []
        return list(rows[0].keys())

class CSVMapper:
    def map_row(self, row: Dict[str, Any], mapping: Dict[str, str]) -> Dict[str, Any]:
        result = {}
        for source_col, target_field in mapping.items():
            if source_col in row:
                result[target_field] = row[source_col]
        return result

class CSVValidator:
    def validate(self, rows: List[Dict[str, Any]]) -> bool:
        return isinstance(rows, list) and len(rows) > 0
