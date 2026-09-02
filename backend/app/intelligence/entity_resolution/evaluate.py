from typing import List, Dict, Any
from backend.app.intelligence.entity_resolution.resolver import calculate_resolution_score

def evaluate_resolution_pairs(pairs: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(pairs)
    if total == 0:
        return {"total": 0, "accuracy": 0.0}
        
    correct = 0
    decisions = {"HIGH_CONFIDENCE_MATCH": 0, "POTENTIAL_LEAD_REVIEW_REQUIRED": 0, "DISTINCT_ENTITY": 0}
    
    for pair in pairs:
        ext = pair["extracted"]
        cand = pair["candidate"]
        expected_match = pair["is_match"]
        
        res = calculate_resolution_score(ext, cand)
        dec = res["decision"]
        decisions[dec] = decisions.get(dec, 0) + 1
        
        predicted_match = (dec in ["HIGH_CONFIDENCE_MATCH", "POTENTIAL_LEAD_REVIEW_REQUIRED"])
        if predicted_match == expected_match:
            correct += 1
            
    return {
        "total_evaluated": total,
        "correct": correct,
        "accuracy": round(correct / total, 4),
        "decision_breakdown": decisions
    }
