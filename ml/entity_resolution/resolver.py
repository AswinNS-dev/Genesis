import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
from entity_resolution.normalizer import normalize_name, normalize_phone, normalize_vehicle, normalize_location
from entity_resolution.similarity import exact_match, fuzzy_match, partial_match
from entity_resolution.embedder import compute_semantic_similarity

def calculate_resolution_score(extracted_entity: dict, candidate_entity: dict) -> dict:
    # extracted_entity is what NER found: {"name": "R. Kumar", "type": "PERSON", "context_phone": "9876543210"}
    # candidate_entity is from DB: {"id": "P-123", "name": "Ravi Kumar", "aliases": ["Ravi K"], "phone": "9876543210", ...}
    
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
        
    # Calculate weighted score
    # configurable heuristic weights
    weights = {
        "name_similarity": 0.35,
        "alias_similarity": 0.20,
        "phone_match": 0.20,
        "vehicle_match": 0.10,
        "location_similarity": 0.05,
        "semantic_similarity": 0.10
    }
    
    # Only weigh fields that were actually provided in the extracted entity to avoid penalizing missing context
    active_weights = 0.0
    weighted_sum = 0.0
    
    for key, weight in weights.items():
        # Check if the extracted entity actually had information for this field
        # We assume if the score is > 0 or if the field was present
        has_field = False
        if key in ["name_similarity", "semantic_similarity"] and extracted_entity.get("name"): has_field = True
        elif key == "alias_similarity" and (extracted_entity.get("alias") or extracted_entity.get("name")): has_field = True
        elif key == "phone_match" and extracted_entity.get("phone"): has_field = True
        elif key == "vehicle_match" and extracted_entity.get("vehicle"): has_field = True
        elif key == "location_similarity" and extracted_entity.get("location"): has_field = True
        
        if has_field:
            active_weights += weight
            weighted_sum += signals[key] * weight
            
    final_score = (weighted_sum / active_weights) if active_weights > 0 else 0.0
    
    # Decision Logic
    if final_score >= config.ENTITY_MATCH_THRESHOLD:
        decision = "MATCH"
    elif final_score >= config.ENTITY_REVIEW_THRESHOLD:
        decision = "REVIEW"
    else:
        decision = "NEW_ENTITY"
        
    return {
        "input_entity": extracted_entity.get("name", ""),
        "matched_entity_id": candidate_entity.get("id", ""),
        "canonical_name": candidate_entity.get("name", ""),
        "decision": decision,
        "confidence": round(final_score, 4),
        "signals": {k: round(v, 4) for k, v in signals.items()}
    }

def resolve_entities(extracted_entities: list, registry_candidates: list) -> list:
    results = []
    for ext in extracted_entities:
        best_match = None
        best_score = -1
        
        # In a real system, we wouldn't scan the entire registry, but use Elasticsearch/Vector DB
        # Here we assume candidate_entities are pre-filtered candidates (e.g. by trigram or exact match)
        for cand in registry_candidates:
            # Only compare same types roughly
            if ext.get("type") != cand.get("type") and ext.get("type") and cand.get("type"):
                continue
                
            res = calculate_resolution_score(ext, cand)
            if res["confidence"] > best_score:
                best_score = res["confidence"]
                best_match = res
                
        if best_match:
            results.append(best_match)
        else:
            results.append({
                "input_entity": ext.get("name", ""),
                "matched_entity_id": None,
                "canonical_name": None,
                "decision": "NEW_ENTITY",
                "confidence": 0.0,
                "signals": {}
            })
            
    return results
