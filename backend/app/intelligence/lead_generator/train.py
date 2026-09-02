import os
import json
from backend.app.intelligence.lead_generator.features import build_lead_features
from backend.app.intelligence.lead_generator.labels import generate_weak_labels
from backend.app.intelligence.lead_generator.model import LeadRankerModel

def train_leads():
    print("Building lead generator features...")
    features_df = build_lead_features(data_dir="data/raw")
    
    if features_df.empty:
        print("No feature data available.")
        return
        
    print("Generating weak supervision labels...")
    labeled_df = generate_weak_labels(features_df)
    
    positives = labeled_df['is_lead'].sum()
    negatives = len(labeled_df) - positives
    print(f"Dataset: {len(labeled_df)} pairs. Positives: {positives}, Negatives: {negatives}")
    
    model = LeadRankerModel()
    
    print("Training XGBoost Lead Ranker...")
    success = model.train(labeled_df)
    
    if success:
        model_path = "backend/app/intelligence/models/lead_generator/ranker.pkl"
        model.save(model_path)
        print(f"Saved lead generator model to {model_path}")
        
    metrics = {
        "status": "TRAINED" if success else "FAILED",
        "total_candidates": len(labeled_df),
        "positive_leads": int(positives)
    }
    
    os.makedirs("backend/app/intelligence/reports", exist_ok=True)
    with open("backend/app/intelligence/reports/lead_generator_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

if __name__ == "__main__":
    train_leads()
