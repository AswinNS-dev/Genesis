import pandas as pd
import numpy as np
import os

def load_data(data_dir="data/raw"):
    calls = pd.read_csv(f"{data_dir}/call_records.csv") if os.path.exists(f"{data_dir}/call_records.csv") else pd.DataFrame()
    trans = pd.read_csv(f"{data_dir}/financial_transactions.csv") if os.path.exists(f"{data_dir}/financial_transactions.csv") else pd.DataFrame()
    vehicles = pd.read_csv(f"{data_dir}/vehicle_records.csv") if os.path.exists(f"{data_dir}/vehicle_records.csv") else pd.DataFrame()
    master = pd.read_csv(f"{data_dir}/master_intelligence.csv") if os.path.exists(f"{data_dir}/master_intelligence.csv") else pd.DataFrame()
    return calls, trans, vehicles, master

def extract_lead_candidates(calls, trans, vehicles, master):
    """
    Generates potential investigation leads (Entity A -> Entity B).
    For simplicity, we extract all pairs that have interacted in any dataset.
    """
    relationships = []
    
    # Calls
    if not calls.empty and 'caller_person_id' in calls.columns:
        call_pairs = calls[['caller_person_id', 'receiver_person_id', 'duration_seconds', 'case_id']].copy()
        call_pairs.columns = ['p1', 'p2', 'call_duration', 'case_id']
        call_pairs['source'] = 'CALL'
        relationships.append(call_pairs)
        
    # Transactions
    if not trans.empty and 'sender_person_id' in trans.columns:
        tx_pairs = trans[['sender_person_id', 'receiver_person_id', 'amount_inr', 'case_id']].copy()
        tx_pairs.columns = ['p1', 'p2', 'amount', 'case_id']
        tx_pairs['source'] = 'TRANSACTION'
        relationships.append(tx_pairs)
        
    if not relationships:
        return pd.DataFrame()
        
    df = pd.concat(relationships, ignore_index=True)
    df.dropna(subset=['p1', 'p2'], inplace=True)
    
    # Normalize pairs so p1 < p2
    mask = df['p1'] > df['p2']
    df.loc[mask, ['p1', 'p2']] = df.loc[mask, ['p2', 'p1']].values
    
    # Group by pair to extract features
    features = []
    for (p1, p2), group in df.groupby(['p1', 'p2']):
        sources = group['source'].unique()
        calls_group = group[group['source'] == 'CALL']
        tx_group = group[group['source'] == 'TRANSACTION']
        
        feat = {
            'p1': p1,
            'p2': p2,
            'communication_frequency': len(calls_group),
            'average_call_duration': calls_group['call_duration'].mean() if len(calls_group) > 0 else 0,
            'transaction_count': len(tx_group),
            'total_amount': tx_group['amount'].sum() if len(tx_group) > 0 else 0,
            'average_amount': tx_group['amount'].mean() if len(tx_group) > 0 else 0,
            'shared_case_count': group['case_id'].nunique(),
            'evidence_count': len(group),
            'multi_source_support': len(sources)
        }
        features.append(feat)
        
    return pd.DataFrame(features)

def build_lead_features(data_dir="data/raw"):
    calls, trans, vehicles, master = load_data(data_dir)
    return extract_lead_candidates(calls, trans, vehicles, master)
