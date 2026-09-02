from typing import List, Dict, Any

class ExplainabilityEngine:
    def explain(self, reasons: List[str], confidence: int) -> Dict[str, Any]:
        return {
            "confidence": confidence,
            "reasons": reasons,
            "reviewRequirement": "Human investigator verification mandatory."
        }
