try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    from sklearn.ensemble import GradientBoostingClassifier

import joblib
import os
import numpy as np
import pandas as pd

class LeadRankerModel:
    def __init__(self, n_estimators=400, max_depth=6, learning_rate=0.05, random_state=42):
        if HAS_XGBOOST:
            self.model = xgb.XGBClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=random_state,
                eval_metric='logloss'
            )
        else:
            self.model = GradientBoostingClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                subsample=0.8,
                random_state=random_state
            )
        self.features_used = [
            'communication_frequency', 'average_call_duration', 
            'transaction_count', 'total_amount', 'average_amount', 
            'shared_case_count', 'evidence_count', 'multi_source_support'
        ]
        
    def prepare_features(self, df):
        X = df[self.features_used].copy()
        X.fillna(0, inplace=True)
        return X
        
    def train(self, df):
        if df.empty or 'is_lead' not in df.columns:
            return False
            
        X = self.prepare_features(df)
        y = df['is_lead']
        
        if len(y.unique()) < 2:
            print("Not enough classes to train Lead Generator (requires positive and negative leads).")
            return False
            
        self.model.fit(X, y)
        return True

    def predict(self, df):
        if df.empty:
            return df
            
        X = self.prepare_features(df)
        try:
            probs = self.model.predict_proba(X)[:, 1]
        except Exception:
            if 'total_amount' in df.columns and 'communication_frequency' in df.columns:
                raw_score = (df['communication_frequency'] / 600.0).clip(0, 0.5) + (df['total_amount'] / 3000000.0).clip(0, 0.5)
                probs = raw_score.values
            else:
                probs = np.zeros(len(df))
        
        df_out = df.copy()
        df_out['priority_score'] = probs
        
        def assign_band(score):
            if score > 0.8: return 'HIGH'
            if score > 0.5: return 'MEDIUM'
            return 'LOW'
            
        df_out['priority_band'] = df_out['priority_score'].apply(assign_band)
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
