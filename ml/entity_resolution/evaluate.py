import os
import sys
import pandas as pd
import json
from collections import defaultdict
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
from entity_resolution.resolver import calculate_resolution_score

def evaluate_resolution():
    print("Loading CSV for evaluation...")
    csv_path = "C:/Users/Giridharan/Genesis/synthetic_entities_100k.csv"
    df = pd.read_csv(csv_path)
    
    # We only care about persons for this eval
    persons_df = df.dropna(subset=['person_id', 'person_name'])
    
    # Group by person_id to generate positive pairs
    person_groups = persons_df.groupby('person_id')
    
    positive_pairs = []
    negative_pairs = []
    
    print("Generating evaluation pairs...")
    
    # Positive pairs: different records of the same person_id
    for pid, group in person_groups:
        records = group.to_dict('records')
        if len(records) > 1:
            # Take up to 2 positive pairs per person to avoid explosion
            for i in range(min(2, len(records) - 1)):
                ext = {
                    "name": records[i].get("person_name"),
                    "alias": records[i].get("aliases"),
                    "phone": records[i].get("phone_number"),
                    "vehicle": records[i].get("vehicle_plate"),
                    "location": records[i].get("location")
                }
                cand = {
                    "id": pid,
                    "name": records[i+1].get("person_name"),
                    "aliases": [records[i+1].get("aliases")],
                    "phone": records[i+1].get("phone_number"),
                    "vehicle": records[i+1].get("vehicle_plate"),
                    "location": records[i+1].get("location")
                }
                positive_pairs.append((ext, cand))
                
    # Negative pairs: records of different person_ids
    unique_pids = list(person_groups.groups.keys())
    for i in range(min(len(positive_pairs), 2000)): # Match number of positive pairs
        pid1, pid2 = random.sample(unique_pids, 2)
        rec1 = person_groups.get_group(pid1).iloc[0].to_dict()
        rec2 = person_groups.get_group(pid2).iloc[0].to_dict()
        
        ext = {
            "name": rec1.get("person_name"),
            "alias": rec1.get("aliases"),
            "phone": rec1.get("phone_number"),
            "vehicle": rec1.get("vehicle_plate"),
            "location": rec1.get("location")
        }
        cand = {
            "id": pid2,
            "name": rec2.get("person_name"),
            "aliases": [rec2.get("aliases")],
            "phone": rec2.get("phone_number"),
            "vehicle": rec2.get("vehicle_plate"),
            "location": rec2.get("location")
        }
        negative_pairs.append((ext, cand))
        
    print(f"Generated {len(positive_pairs)} positive pairs and {len(negative_pairs)} negative pairs.")
    
    # Evaluate at multiple thresholds
    thresholds = [0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
    threshold_results = []
    
    print("Scoring pairs...")
    pos_scores = [calculate_resolution_score(ext, cand)["confidence"] for ext, cand in positive_pairs]
    neg_scores = [calculate_resolution_score(ext, cand)["confidence"] for ext, cand in negative_pairs]
    
    best_f1 = 0.0
    best_threshold = 0.0
    final_metrics = {}
    
    for th in thresholds:
        tp = sum(1 for s in pos_scores if s >= th)
        fn = len(pos_scores) - tp
        fp = sum(1 for s in neg_scores if s >= th)
        tn = len(neg_scores) - fp
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        fmr = fp / (fp + tn) if (fp + tn) > 0 else 0.0 # False match rate
        fnmr = fn / (fn + tp) if (fn + tp) > 0 else 0.0 # False non-match rate
        
        threshold_results.append({
            "threshold": th,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "false_match_rate": fmr,
            "false_non_match_rate": fnmr
        })
        
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = th
            final_metrics = {
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "false_match_rate": fmr,
                "false_non_match_rate": fnmr,
                "recommended_threshold": th
            }
            
    # Save reports
    os.makedirs(config.REPORTS_DIR, exist_ok=True)
    with open(config.REPORTS_DIR / "entity_resolution_metrics.json", "w") as f:
        json.dump(final_metrics, f, indent=2)
        
    with open(config.REPORTS_DIR / "threshold_analysis.json", "w") as f:
        json.dump(threshold_results, f, indent=2)
        
    print(f"Evaluation complete. Recommended threshold: {best_threshold} (F1: {best_f1:.4f})")

if __name__ == "__main__":
    evaluate_resolution()
