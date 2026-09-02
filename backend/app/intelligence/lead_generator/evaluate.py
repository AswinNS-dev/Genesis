import json
import os
import pandas as pd
from backend.app.intelligence.lead_generator.features import build_lead_features
from backend.app.intelligence.lead_generator.labels import generate_weak_labels
from backend.app.intelligence.lead_generator.model import LeadRankerModel
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

def evaluate_leads():
    print("Building lead generator features for evaluation...")
    features_df = build_lead_features(data_dir="data/raw")
    
    if features_df.empty:
        print("No feature data available.")
        return
        
    labeled_df = generate_weak_labels(features_df)
    
    model = LeadRankerModel()
    model_path = "backend/app/intelligence/models/lead_generator/ranker.pkl"
    if not os.path.exists(model_path):
        print("Model not trained yet.")
        return
        
    model.load(model_path)
    print("Predicting...")
    results = model.predict(labeled_df)
    
    y_true = results['is_lead']
    y_scores = results['priority_score']
    y_pred = (y_scores > 0.5).astype(int)
    
    if len(y_true.unique()) < 2:
        print("Not enough variation in test set to calculate ROC AUC.")
        roc_auc = 0.0
    else:
        roc_auc = roc_auc_score(y_true, y_scores)
        
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    # Calculate Precision@K
    sorted_results = results.sort_values(by='priority_score', ascending=False)
    
    def precision_at_k(k):
        top_k = sorted_results.head(k)
        if len(top_k) == 0: return 0.0
        return top_k['is_lead'].sum() / min(k, len(top_k))
        
    metrics = {
        "evaluation_type": "WEAKLY SUPERVISED",
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(roc_auc),
        "precision_at_5": float(precision_at_k(5)),
        "precision_at_10": float(precision_at_k(10)),
        "precision_at_20": float(precision_at_k(20)),
        "model_version": "lead_generator_v1.0"
    }
    
    os.makedirs("backend/app/intelligence/reports", exist_ok=True)
    with open("backend/app/intelligence/reports/lead_generator_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(json.dumps(metrics, indent=2))
    print("Evaluation complete.")

if __name__ == "__main__":
    evaluate_leads()
