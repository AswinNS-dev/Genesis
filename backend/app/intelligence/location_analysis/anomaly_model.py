import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

class LocationAnomalyModel:
    def __init__(self, contamination=0.05, n_estimators=300, random_state=42):
        self.model = IsolationForest(
            contamination=contamination, 
            n_estimators=n_estimators, 
            random_state=random_state,
            n_jobs=-1
        )
        self.features_used = [
            'visit_count', 'unique_days', 'average_time_between_visits_sec', 
            'night_visit_ratio', 'weekend_visit_ratio', 'unique_event_types', 
            'unique_cases', 'duration_days', 'location_entropy'
        ]
        
    def prepare_features(self, df):
        # Fill missing values with median or 0
        X = df[self.features_used].copy()
        X.fillna(0, inplace=True)
        return X
        
    def train(self, df):
        if df.empty or len(df) < 10:
            print("Not enough data to train Isolation Forest.")
            return False
            
        X = self.prepare_features(df)
        self.model.fit(X)
        return True
        
    def predict(self, df):
        if df.empty:
            return df
            
        X = self.prepare_features(df)
        scores = self.model.decision_function(X)
        preds = self.model.predict(X)
        
        # Normalize scores to 0-1 (higher is more anomalous)
        # IsolationForest returns lower scores for anomalies
        # sc = -1 * scores
        # scaled = (sc - sc.min()) / (sc.max() - sc.min() + 1e-9)
        # Actually, let's just use the inverse decision function directly
        anomaly_scores = 0.5 - scores
        
        df_out = df.copy()
        df_out['anomaly_score'] = anomaly_scores
        df_out['is_anomaly'] = (preds == -1).astype(int)
        
        def assign_band(score):
            if score > 0.6: return 'HIGH'
            if score > 0.4: return 'MEDIUM'
            return 'LOW'
            
        df_out['risk_band'] = df_out['anomaly_score'].apply(assign_band)
        return df_out
        
    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({
            'model': self.model,
            'features': self.features_used
        }, path)
        
    def load(self, path):
        data = joblib.load(path)
        self.model = data['model']
        self.features_used = data['features']
