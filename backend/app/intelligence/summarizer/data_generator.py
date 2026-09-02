import pandas as pd
import json
import random
import os

def generate_summarization_dataset(data_dir="data/raw", out_dir="backend/app/intelligence/data/processed"):
    os.makedirs(out_dir, exist_ok=True)
    
    fir = pd.read_csv(f"{data_dir}/fir_cases.csv") if os.path.exists(f"{data_dir}/fir_cases.csv") else pd.DataFrame()
    master = pd.read_csv(f"{data_dir}/master_intelligence.csv") if os.path.exists(f"{data_dir}/master_intelligence.csv") else pd.DataFrame()
    
    if fir.empty:
        print("No FIR cases available.")
        return
        
    dataset = []
    
    for _, row in fir.iterrows():
        case_id = row.get('case_id')
        if pd.isna(case_id):
            continue
            
        incident_type = row.get('incident_type', 'Unknown incident')
        severity = row.get('severity', 'Unknown severity')
        loc = row.get('location', 'Unknown location')
        desc = row.get('description', '')
        
        # Aggregate master intelligence for this case
        if not master.empty and 'case_id' in master.columns:
            case_intel = master[master['case_id'] == case_id]
            people = case_intel['person_name'].dropna().unique().tolist()
            orgs = case_intel['organization'].dropna().unique().tolist()
            vehicles = case_intel['vehicle_plate'].dropna().unique().tolist()
        else:
            people, orgs, vehicles = [], [], []
            
        context_parts = [
            f"Case: {case_id}",
            f"Type: {incident_type}",
            f"Severity: {severity}",
            f"Location: {loc}",
            f"Description: {desc}",
            f"Associated People: {', '.join(people) if people else 'None'}",
            f"Organizations: {', '.join(orgs) if orgs else 'None'}",
            f"Vehicles: {', '.join(vehicles) if vehicles else 'None'}"
        ]
        case_context = "\n".join(context_parts)
        
        # Multiple target templates
        templates = [
            f"Investigation {case_id} involves a {severity} {incident_type} at {loc}. Intelligence has linked the following individuals: {', '.join(people) if people else 'none identified'}. The incident was described as: {desc}.",
            f"Case {case_id} ({incident_type}): A {severity} incident occurred at {loc}. {('Key suspects/witnesses include ' + ', '.join(people)) if people else 'No individuals have been linked yet'}. Vehicles involved: {', '.join(vehicles) if vehicles else 'none'}.",
            f"Summary for {case_id}: This is a {severity}-priority case regarding {incident_type} at {loc}. {desc} Organizations involved: {', '.join(orgs) if orgs else 'none'}."
        ]
        target_summary = random.choice(templates)
        
        dataset.append({
            "case_id": case_id,
            "input": case_context,
            "target": target_summary
        })
        
    out_file = f"{out_dir}/summarization_dataset.json"
    with open(out_file, "w") as f:
        json.dump(dataset, f, indent=2)
        
    print(f"Generated {len(dataset)} weakly supervised summarization pairs at {out_file}")

if __name__ == "__main__":
    generate_summarization_dataset()
