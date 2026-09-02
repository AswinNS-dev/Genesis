import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import os
import joblib

class LocationHotspotModel:
    def __init__(self, eps=0.5, min_samples=3):
        self.model = DBSCAN(eps=eps, min_samples=min_samples)
        self.scaler = StandardScaler()
        
    def train_and_predict(self, events_df, colocations_df):
        if events_df.empty:
            return pd.DataFrame()
            
        # Group by location to build behavioral vectors
        loc_stats = events_df.groupby('location_id').agg(
            total_visits=('person_id', 'count'),
            unique_people=('person_id', 'nunique'),
            unique_cases=('case_id', 'nunique'),
            night_visits=('night_activity_flag', 'sum'),
            weekend_visits=('weekend_flag', 'sum')
        ).reset_index()
        
        # Add co-location counts
        if not colocations_df.empty:
            co_locs = colocations_df.groupby('location_id')['co_location_count'].sum().reset_index()
            loc_stats = loc_stats.merge(co_locs, on='location_id', how='left')
        else:
            loc_stats['co_location_count'] = 0
            
        loc_stats.fillna(0, inplace=True)
        
        if len(loc_stats) < 5:
            loc_stats['cluster'] = -1
            loc_stats['is_hotspot'] = False
            return loc_stats
            
        features = ['total_visits', 'unique_people', 'unique_cases', 'night_visits', 'weekend_visits', 'co_location_count']
        X = loc_stats[features]
        X_scaled = self.scaler.fit_transform(X)
        
        clusters = self.model.fit_predict(X_scaled)
        loc_stats['cluster'] = clusters
        
        # Determine if it's a hotspot: High activity clusters or noise points with extreme activity
        # Since we use DBSCAN on behavioral data, clusters represent groups of similar behavior.
        # "Hotspots" are those with exceptionally high total_visits or co_locations.
        
        loc_stats['activity_score'] = (
            loc_stats['total_visits'] * 0.3 + 
            loc_stats['unique_people'] * 0.4 + 
            loc_stats['co_location_count'] * 0.3
        )
        
        threshold = loc_stats['activity_score'].quantile(0.85) # Top 15% active
        loc_stats['is_hotspot'] = loc_stats['activity_score'] >= threshold
        
        return loc_stats
