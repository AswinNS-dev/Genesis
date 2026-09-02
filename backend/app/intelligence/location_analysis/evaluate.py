import pandas as pd
import numpy as np
import json
import os
from backend.app.intelligence.location_analysis.features import build_features
from backend.app.intelligence.location_analysis.anomaly_model import LocationAnomalyModel

def evaluate():
    print("Building features for evaluation...")
    pl_features, co_features, events = build_features(data_dir="data/raw")
    
    if pl_features.empty:
        print("No features available.")
        return
        
    model = LocationAnomalyModel()
    model_path = "backend/app/intelligence/models/location/anomaly_model.pkl"
    if not os.path.exists(model_path):
        print("Model not trained yet.")
        return
        
    model.load(model_path)
    
    print("Injecting synthetic anomalies...")
    # Inject synthetic anomalies to measure detection rate
    # E.g. extremely high visits, high night ratio, etc.
    injected = []
    for i in range(100):
        injected.append({
            'person_id': f'SYNTH_ANOMALY_{i}',
            'location_id': f'LOC_{i}',
            'visit_count': np.random.randint(50, 200),
            'unique_days': np.random.randint(1, 5),
            'average_time_between_visits_sec': 60,
            'night_visit_ratio': 0.95,
            'weekend_visit_ratio': 0.9,
            'unique_event_types': 1,
            'unique_cases': 1,
            'duration_days': 5,
            'location_entropy': 0.0,
            'is_injected': 1
        })
        
    eval_df = pl_features.copy()
    eval_df['is_injected'] = 0
    injected_df = pd.DataFrame(injected)
    
    # Merge entropy (dummy for injected)
    combined = pd.concat([eval_df, injected_df], ignore_index=True)
    combined.fillna(0, inplace=True)
    
    print("Predicting...")
    results = model.predict(combined)
    
    # Measure
    injected_results = results[results['is_injected'] == 1]
    normal_results = results[results['is_injected'] == 0]
    
    detected_injected = injected_results['is_anomaly'].sum()
    detection_rate = detected_injected / len(injected_results)
    
    false_positives = normal_results['is_anomaly'].sum()
    fpr = false_positives / len(normal_results)
    
    # Precision/Recall @ K based on anomaly score
    sorted_results = results.sort_values(by='anomaly_score', ascending=False)
    
    def pk(k):
        top_k = sorted_results.head(k)
        return top_k['is_injected'].sum() / k
        
    metrics = {
        "evaluation_type": "WEAKLY SUPERVISED (Injected Anomalies)",
        "injected_anomaly_detection_rate": float(detection_rate),
        "false_positive_rate_on_real_data": float(fpr),
        "precision_at_50": float(pk(50)),
        "precision_at_100": float(pk(100)),
        "precision_at_500": float(pk(500)),
        "model_version": "location_anomaly_v1.0"
    }
    
    with open("backend/app/intelligence/reports/location_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(json.dumps(metrics, indent=2))
    print("Evaluation complete.")

if __name__ == "__main__":
    evaluate()
