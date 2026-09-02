import math
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.app.services.validation_service import validation_service

class EntityResolutionService:
    def resolve_records(self, raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        validated = [validation_service.validate_record(r) for r in raw_records]
        candidates = []

        for i in range(len(validated)):
            for j in range(i + 1, len(validated)):
                cand = self.evaluate_pair(validated[i], validated[j])
                candidates.append(cand)

        candidates.sort(key=lambda x: x["confidence"], reverse=True)

        return {
            "validatedRecords": validated,
            "candidates": candidates,
            "statistics": {
                "recordsAnalyzed": len(validated),
                "candidatePairsGenerated": len(candidates),
                "pendingReviews": len(candidates)
            }
        }

    def evaluate_pair(self, rec_a: Dict[str, Any], rec_b: Dict[str, Any]) -> Dict[str, Any]:
        norm_a = rec_a["normalized"]
        norm_b = rec_b["normalized"]

        # Name similarity
        name_sim = 100 if norm_a["name"] == norm_b["name"] else (80 if norm_a["namePhoneticKey"] == norm_b["namePhoneticKey"] else 30)

        # Phone similarity
        phone_match = bool(norm_a["phone"] and norm_b["phone"] and norm_a["phone"] == norm_b["phone"])

        # Address similarity
        addr_match = bool(norm_a["address"] and norm_b["address"] and norm_a["address"] == norm_b["address"])

        # Case match
        case_match = bool(norm_a["caseId"] and norm_b["caseId"] and norm_a["caseId"] == norm_b["caseId"])

        # DOB contradiction
        dob_conflict = False
        if norm_a["birthYear"] and norm_b["birthYear"]:
            if abs(norm_a["birthYear"] - norm_b["birthYear"]) >= 2:
                dob_conflict = True

        confidence = int(name_sim * 0.35 + (30 if phone_match else 0) + (20 if addr_match else 0) + (15 if case_match else 0))
        if dob_conflict:
            confidence = max(10, confidence - 35)

        classification = "POSSIBLE ASSOCIATION"
        if addr_match and norm_a["birthYear"] == norm_b["birthYear"]:
            classification = "PROBABLE SAME ENTITY"
        elif name_sim >= 70 and not dob_conflict:
            classification = "POSSIBLE SAME ENTITY"
        elif phone_match and dob_conflict:
            classification = "POSSIBLE ASSOCIATION"
        elif dob_conflict and name_sim >= 60:
            classification = "IDENTITY CONFLICT"

        return {
            "id": f"PAIR-{rec_a['id']}-{rec_b['id']}",
            "recordA": rec_a,
            "recordB": rec_b,
            "classification": classification,
            "confidence": confidence,
            "reviewStatus": "PENDING_REVIEW",
            "explanation": f"Candidate match between '{norm_a['name']}' and '{norm_b['name']}' classified as [{classification}]."
        }

entity_resolution_service = EntityResolutionService()
