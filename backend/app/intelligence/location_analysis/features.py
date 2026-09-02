import pandas as pd
import numpy as np
from datetime import datetime
import json
import os

def load_data(data_dir="data/raw"):
    calls = pd.read_csv(f"{data_dir}/call_records.csv") if os.path.exists(f"{data_dir}/call_records.csv") else pd.DataFrame()
    vehicles = pd.read_csv(f"{data_dir}/vehicle_records.csv") if os.path.exists(f"{data_dir}/vehicle_records.csv") else pd.DataFrame()
    fir = pd.read_csv(f"{data_dir}/fir_cases.csv") if os.path.exists(f"{data_dir}/fir_cases.csv") else pd.DataFrame()
    master = pd.read_csv(f"{data_dir}/master_intelligence.csv") if os.path.exists(f"{data_dir}/master_intelligence.csv") else pd.DataFrame()
    return calls, vehicles, fir, master

def extract_location_events(calls, vehicles, fir, master):
    """
    Normalizes all location events into a single DataFrame:
    [person_id, location_id, timestamp, event_type, case_id]
    """
    events = []
    
    # Process Calls (Cell Tower Locations)
    if not calls.empty and 'caller_person_id' in calls.columns:
        call_events_caller = calls[['caller_person_id', 'cell_tower_location_id', 'call_datetime', 'case_id']].copy()
        call_events_caller.columns = ['person_id', 'location_id', 'timestamp', 'case_id']
        call_events_caller['event_type'] = 'CALL_MADE'
        events.append(call_events_caller)
        
        call_events_receiver = calls[['receiver_person_id', 'cell_tower_location_id', 'call_datetime', 'case_id']].copy()
        call_events_receiver.columns = ['person_id', 'location_id', 'timestamp', 'case_id']
        call_events_receiver['event_type'] = 'CALL_RECEIVED'
        events.append(call_events_receiver)

    # Process Vehicles
    if not vehicles.empty and 'owner_person_id' in vehicles.columns:
        veh_events = vehicles[['owner_person_id', 'location_id', 'event_datetime', 'case_id']].copy()
        veh_events.columns = ['person_id', 'location_id', 'timestamp', 'case_id']
        veh_events['event_type'] = 'VEHICLE_OBSERVED'
        events.append(veh_events)

    # Process FIR
    if not fir.empty and 'primary_person_id' in fir.columns:
        fir_events = fir[['primary_person_id', 'location_id', 'incident_date', 'case_id']].copy()
        fir_events.columns = ['person_id', 'location_id', 'timestamp', 'case_id']
        fir_events['event_type'] = 'FIR_INCIDENT'
        events.append(fir_events)
        
    # Process Master Intelligence
    if not master.empty and 'person_id' in master.columns and 'location_id' in master.columns:
        mast_events = master[['person_id', 'location_id', 'event_date', 'case_id']].copy()
        mast_events.columns = ['person_id', 'location_id', 'timestamp', 'case_id']
        mast_events['event_type'] = 'INTELLIGENCE_REPORT'
        events.append(mast_events)

    if not events:
        return pd.DataFrame(columns=['person_id', 'location_id', 'timestamp', 'case_id', 'event_type'])
        
    df = pd.concat(events, ignore_index=True)
    df.dropna(subset=['person_id', 'location_id', 'timestamp'], inplace=True)
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df.dropna(subset=['timestamp'], inplace=True)
    
    # Sort chronologically
    df = df.sort_values(by='timestamp').reset_index(drop=True)
    return df

def generate_temporal_features(df):
    """
    Extracts temporal components from timestamp.
    """
    df = df.copy()
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['day_of_month'] = df['timestamp'].dt.day
    df['month'] = df['timestamp'].dt.month
    df['weekend_flag'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['night_activity_flag'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
    df['business_hours_flag'] = ((df['hour'] >= 9) & (df['hour'] <= 17) & (df['weekend_flag'] == 0)).astype(int)
    return df

def generate_person_location_features(df):
    """
    Calculates behavioral metrics for person-location pairs.
    """
    if df.empty:
        return pd.DataFrame()

    df_days = df.copy()
    df_days['date'] = df_days['timestamp'].dt.date

    grouped = df_days.groupby(['person_id', 'location_id'])
    pl_df = grouped.agg(
        visit_count=('timestamp', 'count'),
        unique_days=('date', 'nunique'),
        first_visit=('timestamp', 'min'),
        last_visit=('timestamp', 'max'),
        night_visits=('night_activity_flag', 'sum'),
        weekend_visits=('weekend_flag', 'sum'),
        unique_event_types=('event_type', 'nunique'),
        unique_cases=('case_id', 'nunique'),
    ).reset_index()

    pl_df['average_time_between_visits_sec'] = 0.0
    pl_df['night_visit_ratio'] = pl_df['night_visits'] / pl_df['visit_count']
    pl_df['weekend_visit_ratio'] = pl_df['weekend_visits'] / pl_df['visit_count']
    pl_df['duration_days'] = (pl_df['last_visit'] - pl_df['first_visit']).dt.days + 1

    pl_df.drop(columns=['first_visit', 'last_visit', 'night_visits', 'weekend_visits'], inplace=True, errors='ignore')

    # Calculate global location entropy per person
    person_loc_counts = pl_df.groupby('person_id')['visit_count'].sum().rename('total_visits')
    pl_df = pl_df.merge(person_loc_counts, on='person_id')
    pl_df['visit_prob'] = pl_df['visit_count'] / pl_df['total_visits']
    
    def calc_entropy(probs):
        return -np.sum(probs * np.log(probs + 1e-9))
        
    entropies = pl_df.groupby('person_id')['visit_prob'].apply(calc_entropy).rename('location_entropy')
    pl_df = pl_df.merge(entropies, on='person_id')
    
    return pl_df

def generate_colocation_features(df, window_minutes=30):
    """
    Detects pairs of people at the same location within a time window.
    """
    df_sorted = df.sort_values(by=['location_id', 'timestamp'])
    
    colocations = []
    
    for loc_id, group in df_sorted.groupby('location_id'):
        if len(group) < 2:
            continue
            
        times = group['timestamp'].values
        persons = group['person_id'].values
        cases = group['case_id'].values
        events = group['event_type'].values
        
        for i in range(len(times)):
            for j in range(i+1, len(times)):
                time_diff = (times[j] - times[i]) / np.timedelta64(1, 's') / 60.0
                if time_diff > window_minutes:
                    break 
                
                p1, p2 = persons[i], persons[j]
                if p1 != p2:
                    pA, pB = min(p1, p2), max(p1, p2)
                    colocations.append({
                        'p1': pA, 'p2': pB,
                        'location_id': loc_id,
                        'time_diff_minutes': time_diff,
                        'shared_case': cases[i] == cases[j] and pd.notna(cases[i]),
                        'shared_event_type': events[i] == events[j]
                    })
                    
    co_df = pd.DataFrame(colocations)
    if co_df.empty:
        return pd.DataFrame()
        
    agg_co = co_df.groupby(['p1', 'p2', 'location_id']).agg(
        co_location_count=('time_diff_minutes', 'count'),
        minimum_time_difference=('time_diff_minutes', 'min'),
        average_time_difference=('time_diff_minutes', 'mean'),
        shared_case_count=('shared_case', 'sum'),
        shared_event_type_count=('shared_event_type', 'sum')
    ).reset_index()
    
    return agg_co

def build_features(data_dir="data/raw", include_colocation=True):
    calls, vehicles, fir, master = load_data(data_dir)
    events = extract_location_events(calls, vehicles, fir, master)
    if events.empty:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
        
    events = generate_temporal_features(events)
    pl_features = generate_person_location_features(events)
    co_features = generate_colocation_features(events) if include_colocation else pd.DataFrame()
    
    if not pl_features.empty:
        pl_features.fillna(0, inplace=True)
    
    return pl_features, co_features, events
