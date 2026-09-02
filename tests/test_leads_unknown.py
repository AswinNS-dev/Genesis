import os
import sys
import pandas as pd

_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from backend.app.intelligence.lead_generator.model import LeadRankerModel

def test_leads_unknown():
    print("\n--- 4. Lead Generator (Artificial Unknown Candidates) ---")
    model = LeadRankerModel()
    try:
        model.load("backend/app/intelligence/models/lead_generator/ranker.pkl")
    except Exception as e:
        print("Model load failed:", e)
        return

    # Create artificial unknown inputs
    unknown_candidates = pd.DataFrame([
        {
            # Suspicious candidate (High frequency, high amounts)
            "p1": "SUSPECT-A",
            "p2": "SUSPECT-B",
            "communication_frequency": 540,
            "average_call_duration": 1200,
            "transaction_count": 15,
            "total_amount": 2500000,
            "average_amount": 166666,
            "shared_case_count": 3,
            "evidence_count": 555,
            "multi_source_support": 3
        },
        {
            # Innocent candidate (1 call, 0 amount)
            "p1": "INNOCENT-A",
            "p2": "INNOCENT-B",
            "communication_frequency": 1,
            "average_call_duration": 15,
            "transaction_count": 0,
            "total_amount": 0,
            "average_amount": 0,
            "shared_case_count": 0,
            "evidence_count": 1,
            "multi_source_support": 1
        }
    ])

    results = model.predict(unknown_candidates)
    
    for _, row in results.iterrows():
        print(f"Pair: {row['p1']} <-> {row['p2']}")
        print(f"Priority Score: {row['priority_score']:.4f}")
        print(f"Priority Band: {row['priority_band']}\n")

if __name__ == "__main__":
    test_leads_unknown()
