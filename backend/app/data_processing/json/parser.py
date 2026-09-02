import json
from typing import Any

class JSONParser:
    def parse(self, content: bytes) -> Any:
        return json.loads(content.decode("utf-8", errors="ignore"))
