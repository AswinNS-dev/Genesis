import pandas as pd
import numpy as np

def generate_weak_labels(features_df):
    """
    Generates synthetic 'is_lead' labels for training the ranker.
    Positive lead criteria (Weak Supervision):
    - Supported by multiple sources (e.g., Calls AND Transactions)
    - High communication frequency (> 90th percentile)
    - Shared case context
    """
    if features_df.empty:
        return features_df
        
    df = features_df.copy()
    
    # Calculate thresholds
    comm_thresh = df['communication_frequency'].quantile(0.9) if not df['communication_frequency'].empty else 0
    tx_thresh = df['total_amount'].quantile(0.9) if not df['total_amount'].empty else 0
    
    def is_lead(row):
        score = 0
        if row['multi_source_support'] > 1:
            score += 2
        if row['communication_frequency'] >= comm_thresh and comm_thresh > 0:
            score += 1
        if row['total_amount'] >= tx_thresh and tx_thresh > 0:
            score += 1
        if row['shared_case_count'] > 0:
            score += 1
            
        return int(score >= 2)
        
    df['is_lead'] = df.apply(is_lead, axis=1)
    
    return df
