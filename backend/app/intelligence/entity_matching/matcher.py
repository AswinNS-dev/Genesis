from typing import Dict, Any
from backend.app.intelligence.entity_matching.base import BaseEntityMatcher, MatchCandidateResult
from backend.app.intelligence.entity_matching.scoring import calculate_entity_similarity

class EntityMatcher(BaseEntityMatcher):
    def match(self, entity_a: Dict[str, Any], entity_b: Dict[str, Any]) -> MatchCandidateResult:
        score = calculate_entity_similarity(entity_a.get("name", ""), entity_b.get("name", ""))
        return MatchCandidateResult(
            entityAId=entity_a.get("id", ""),
            entityBId=entity_b.get("id", ""),
            confidence=score,
            reasons=["Token similarity match"] if score > 50 else []
        )
