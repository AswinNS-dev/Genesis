import os
import pandas as pd
import numpy as np

def load_data(data_dir: str = "data/raw"):
    calls = pd.read_csv(f"{data_dir}/call_records.csv") if os.path.exists(f"{data_dir}/call_records.csv") else pd.DataFrame()
    trans = pd.read_csv(f"{data_dir}/financial_transactions.csv") if os.path.exists(f"{data_dir}/financial_transactions.csv") else pd.DataFrame()
    vehicles = pd.read_csv(f"{data_dir}/vehicle_records.csv") if os.path.exists(f"{data_dir}/vehicle_records.csv") else pd.DataFrame()
    master = pd.read_csv(f"{data_dir}/master_intelligence.csv") if os.path.exists(f"{data_dir}/master_intelligence.csv") else pd.DataFrame()
    return calls, trans, vehicles, master

def extract_lead_candidates(calls, trans, vehicles, master):
    """
    Generates potential investigation leads (Entity A -> Entity B).
    Vectorized extraction and aggregation.
    """
    relationships = []

    # Calls
    if not calls.empty and 'caller_person_id' in calls.columns:
        call_pairs = calls[['caller_person_id', 'receiver_person_id', 'duration_seconds', 'case_id']].copy()
        call_pairs.columns = ['p1', 'p2', 'call_duration', 'case_id']
        call_pairs['source'] = 'CALL'
        call_pairs['amount'] = 0.0
        relationships.append(call_pairs)

    # Transactions
    if not trans.empty and 'sender_person_id' in trans.columns:
        tx_pairs = trans[['sender_person_id', 'receiver_person_id', 'amount_inr', 'case_id']].copy()
        tx_pairs.columns = ['p1', 'p2', 'amount', 'case_id']
        tx_pairs['source'] = 'TRANSACTION'
        tx_pairs['call_duration'] = 0.0
        relationships.append(tx_pairs)

    if not relationships:
        return pd.DataFrame()

    df = pd.concat(relationships, ignore_index=True)
    df.dropna(subset=['p1', 'p2'], inplace=True)

    # Normalize pairs so p1 < p2
    mask = df['p1'] > df['p2']
    df.loc[mask, ['p1', 'p2']] = df.loc[mask, ['p2', 'p1']].values

    df['is_call'] = (df['source'] == 'CALL').astype(int)
    df['is_tx'] = (df['source'] == 'TRANSACTION').astype(int)
    df['call_duration'] = df.get('call_duration', pd.Series([0.0] * len(df))).fillna(0.0)
    df['amount'] = df.get('amount', pd.Series([0.0] * len(df))).fillna(0.0)

    agg = df.groupby(['p1', 'p2']).agg(
        communication_frequency=('is_call', 'sum'),
        call_duration_sum=('call_duration', 'sum'),
        transaction_count=('is_tx', 'sum'),
        total_amount=('amount', 'sum'),
        shared_case_count=('case_id', 'nunique'),
        evidence_count=('source', 'count'),
        multi_source_support=('source', 'nunique')
    ).reset_index()

    agg['average_call_duration'] = np.where(
        agg['communication_frequency'] > 0,
        agg['call_duration_sum'] / agg['communication_frequency'],
        0.0
    )
    agg['average_amount'] = np.where(
        agg['transaction_count'] > 0,
        agg['total_amount'] / agg['transaction_count'],
        0.0
    )
    agg.drop(columns=['call_duration_sum'], inplace=True, errors='ignore')
    return agg

def build_lead_features(data_dir: str = "data/raw"):
    calls, trans, vehicles, master = load_data(data_dir)
    features_df = extract_lead_candidates(calls, trans, vehicles, master)
    return features_df
