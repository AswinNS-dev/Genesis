from typing import List, Dict, Any, Optional
from backend.app.config.settings import settings
from backend.app.intelligence.entity_resolution.normalizer import (
    normalize_name, normalize_phone, normalize_vehicle, normalize_location
)
from backend.app.intelligence.entity_resolution.similarity import exact_match, fuzzy_match, partial_match
from backend.app.intelligence.entity_resolution.embedder import compute_semantic_similarity

def calculate_resolution_score(extracted_entity: Dict[str, Any], candidate_entity: Dict[str, Any]) -> Dict[str, Any]:
    signals = {
        "name_similarity": 0.0,
        "alias_similarity": 0.0,
        "phone_match": 0.0,
        "vehicle_match": 0.0,
        "location_similarity": 0.0,
        "semantic_similarity": 0.0
    }
    
    # 1. Name Match
    ext_name = normalize_name(extracted_entity.get("name", ""))
    cand_name = normalize_name(candidate_entity.get("name", ""))
    
    if ext_name and cand_name:
        signals["name_similarity"] = max(
            exact_match(ext_name, cand_name),
            fuzzy_match(ext_name, cand_name),
            partial_match(ext_name, cand_name)
        )
        signals["semantic_similarity"] = compute_semantic_similarity(ext_name, cand_name)
        
    # 2. Alias Match
    ext_alias = normalize_name(extracted_entity.get("alias", ""))
    cand_aliases = [normalize_name(a) for a in candidate_entity.get("aliases", []) if a]
    
    if (ext_name or ext_alias) and cand_aliases:
        alias_scores = []
        name_to_check = ext_alias if ext_alias else ext_name
        for ca in cand_aliases:
            alias_scores.append(max(
                exact_match(name_to_check, ca),
                fuzzy_match(name_to_check, ca)
            ))
        signals["alias_similarity"] = max(alias_scores) if alias_scores else 0.0
        
    # 3. Exact Identifiers (Phone, Vehicle)
    ext_phone = normalize_phone(extracted_entity.get("phone", ""))
    cand_phone = normalize_phone(candidate_entity.get("phone", ""))
    if ext_phone and cand_phone:
        signals["phone_match"] = exact_match(ext_phone, cand_phone)
        
    ext_vehicle = normalize_vehicle(extracted_entity.get("vehicle", ""))
    cand_vehicle = normalize_vehicle(candidate_entity.get("vehicle", ""))
    if ext_vehicle and cand_vehicle:
        signals["vehicle_match"] = exact_match(ext_vehicle, cand_vehicle)
        
    # 4. Context Location
    ext_loc = normalize_location(extracted_entity.get("location", ""))
    cand_loc = normalize_location(candidate_entity.get("location", ""))
    if ext_loc and cand_loc:
        signals["location_similarity"] = fuzzy_match(ext_loc, cand_loc)
        
    # Multi-signal weights
    weights = {
        "name_similarity": 0.35,
        "alias_similarity": 0.20,
        "phone_match": 0.20,
        "vehicle_match": 0.10,
        "location_similarity": 0.05,
        "semantic_similarity": 0.10
    }
    
    active_weights = 0.0
    weighted_sum = 0.0
    
    for key, weight in weights.items():
        has_field = False
        if key in ["name_similarity", "semantic_similarity"] and (ext_name and cand_name):
            has_field = True
        elif key == "alias_similarity" and ((ext_alias and cand_aliases) or (ext_name and cand_aliases)):
            has_field = True
        elif key == "phone_match" and (ext_phone and cand_phone):
            has_field = True
        elif key == "vehicle_match" and (ext_vehicle and cand_vehicle):
            has_field = True
        elif key == "location_similarity" and (ext_loc and cand_loc):
            has_field = True
        
        if has_field:
            active_weights += weight
            weighted_sum += signals[key] * weight
            
    final_score = (weighted_sum / active_weights) if active_weights > 0 else 0.0
    
    # Investigator-Safe Decision Logic
    match_threshold = getattr(settings, "ENTITY_MATCH_THRESHOLD", 0.85)
    review_threshold = getattr(settings, "ENTITY_REVIEW_THRESHOLD", 0.65)

    if final_score >= match_threshold:
        decision = "HIGH_CONFIDENCE_MATCH"
        explanation = f"Potential match confirmed across primary identifiers (Confidence: {round(final_score * 100)}%). Ready for investigator review."
        requires_review = False
    elif final_score >= review_threshold:
        decision = "POTENTIAL_LEAD_REVIEW_REQUIRED"
        explanation = f"Investigative lead: Partial matching signals detected ({round(final_score * 100)}%). Requires manual investigator verification before merging."
        requires_review = True
    else:
        decision = "DISTINCT_ENTITY"
        explanation = "No significant identifier correlation found with candidate registry records."
        requires_review = False
        
    return {
        "input_entity": extracted_entity.get("name", ""),
        "matched_entity_id": candidate_entity.get("id", ""),
        "canonical_name": candidate_entity.get("name", ""),
        "decision": decision,
        "confidence": round(final_score, 4),
        "requires_review": requires_review,
        "explanation": explanation,
        "signals": {k: round(v, 4) for k, v in signals.items()}
    }

class EntityResolutionService:
    def resolve(self, extracted_entities: List[Dict[str, Any]], registry_candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for ext in extracted_entities:
            best_match = None
            best_score = -1.0
            
            for cand in registry_candidates:
                if ext.get("type") and cand.get("type") and ext.get("type").upper() != cand.get("type").upper():
                    continue
                    
                res = calculate_resolution_score(ext, cand)
                if res["confidence"] > best_score:
                    best_score = res["confidence"]
                    best_match = res
                    
            if best_match and best_score >= getattr(settings, "ENTITY_REVIEW_THRESHOLD", 0.65):
                results.append(best_match)
            else:
                results.append({
                    "input_entity": ext.get("name", ""),
                    "matched_entity_id": None,
                    "canonical_name": None,
                    "decision": "DISTINCT_ENTITY",
                    "confidence": 0.0,
                    "requires_review": False,
                    "explanation": "No existing registry matches identified. New entity profile recommended.",
                    "signals": {}
                })
                
        return results

entity_resolution_service = EntityResolutionService()
