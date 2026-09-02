import os
import json
from backend.app.intelligence.location_analysis.features import build_features
from backend.app.intelligence.location_analysis.anomaly_model import LocationAnomalyModel
from backend.app.intelligence.location_analysis.clustering import LocationHotspotModel

def train_all():
    print("Building Location Features...")
    pl_features, co_features, events = build_features(data_dir="data/raw")
    
    if pl_features.empty:
        print("No location features generated. Exiting.")
        return
        
    print(f"Generated features for {len(pl_features)} person-location pairs.")
    
    print("Training Location Anomaly Model...")
    anomaly_model = LocationAnomalyModel(contamination=0.05)
    success = anomaly_model.train(pl_features)
    
    if success:
        model_path = "backend/app/intelligence/models/location/anomaly_model.pkl"
        anomaly_model.save(model_path)
        print(f"Saved anomaly model to {model_path}")
        
    print("Training Hotspot Model (clustering)...")
    hotspot_model = LocationHotspotModel()
    hotspots_df = hotspot_model.train_and_predict(events, co_features)
    
    hotspot_path = "backend/app/intelligence/models/location/hotspots.csv"
    os.makedirs(os.path.dirname(hotspot_path), exist_ok=True)
    hotspots_df.to_csv(hotspot_path, index=False)
    print(f"Saved hotspots data to {hotspot_path}")
    
    # Save a quick metrics dict indicating training succeeded
    metrics = {
        "status": "TRAINED",
        "person_location_pairs": len(pl_features),
        "co_location_pairs": len(co_features),
        "hotspots_detected": int(hotspots_df['is_hotspot'].sum()) if not hotspots_df.empty else 0
    }
    
    os.makedirs("backend/app/intelligence/reports", exist_ok=True)
    with open("backend/app/intelligence/reports/location_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    print("Location Analysis training complete.")

if __name__ == "__main__":
    train_all()
