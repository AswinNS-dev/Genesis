import pandas as pd
import json
import random
import re
import os

random.seed(42)

def generate_from_template(template_str, entity_mapping):
    parts = re.split(r'(\{[^\}]+\})', template_str)
    tokens = []
    tags = []
    
    for part in parts:
        if part.startswith("{") and part.endswith("}"):
            key = part[1:-1]
            if key in entity_mapping:
                val, label = entity_mapping[key]
                if pd.isna(val) or val == "":
                    return None # Skip if required entity is missing
                val = str(val)
                val_tokens = re.findall(r'\w+|[^\w\s]', val)
                for i, vtok in enumerate(val_tokens):
                    tokens.append(vtok)
                    tags.append(f"B-{label}" if i == 0 else f"I-{label}")
        else:
            text_tokens = re.findall(r'\w+|[^\w\s]', part)
            for ttok in text_tokens:
                tokens.append(ttok)
                tags.append("O")
                
    return {"tokens": tokens, "ner_tags": tags}

def main():
    csv_path = "C:/Users/Giridharan/Genesis/synthetic_entities_100k.csv"
        
    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Entity split: get unique person_ids
    unique_persons = df['person_id'].unique()
    random.shuffle(unique_persons)
    
    n_train = int(len(unique_persons) * 0.7)
    n_val = int(len(unique_persons) * 0.15)
    
    train_ids = set(unique_persons[:n_train])
    val_ids = set(unique_persons[n_train:n_train+n_val])
    test_ids = set(unique_persons[n_train+n_val:])
    
    templates = {
        "CALL_LOG": [
            "{person_name} called {target_person} from {phone_number}.",
            "A call was made by {person_name} to {target_person} on {event_date}.",
            "{target_person} received a call from {person_name}."
        ],
        "LOCATION_PING": [
            "{person_name} was recorded near {location} on {event_date}.",
            "{person_name} was observed at {location}.",
            "Location ping for {person_name} at {location}."
        ],
        "VEHICLE_MOVEMENT": [
            "{person_name} was associated with vehicle {vehicle_plate} near {location}.",
            "Vehicle {vehicle_plate} driven by {person_name} was spotted on {event_date}."
        ],
        "FINANCIAL_TXN": [
            "{person_name} transferred ₹{amount_inr}.",
            "{person_name} was associated with a financial transaction involving ₹{amount_inr} on {event_date}.",
            "An amount of ₹{amount_inr} was sent to {target_person} by {person_name}."
        ],
        "REGISTRATION_RECORD": [
            "{person_name} was registered with {organization} on {event_date}.",
            "{organization} has a record for {person_name}."
        ],
        "SIGHTING_REPORT": [
            "{person_name} was sighted at {location} on {event_date}.",
            "Sighting of {person_name} in {location}."
        ]
    }
    
    general_templates = [
        "{person_name} (also known as {aliases}) is linked to case {case_id}.",
        "Case {case_id} involves {person_name} and {target_person}."
    ]
    
    train_data, val_data, test_data = [], [], []
    
    print("Generating sentences...")
    
    for idx, row in df.iterrows():
        entity_mapping = {
            "person_name": (row['person_name'], "PERSON"),
            "aliases": (row['aliases'], "ALIAS"),
            "phone_number": (row['phone_number'], "PHONE"),
            "vehicle_plate": (row['vehicle_plate'], "VEHICLE"),
            "location": (row['location'], "LOCATION"),
            "organization": (row['organization'], "ORGANIZATION"),
            "case_id": (row['case_id'], "CASE_ID"),
            "event_date": (row['event_date'], "DATE"),
            "amount_inr": (row['amount_inr'], "MONEY"),
            "target_person": (row['target_person'], "PERSON")
        }
        
        event_type = row['event_type']
        
        # Pick a random template for the event
        available_templates = templates.get(event_type, [])
        if available_templates:
            chosen = random.choice(available_templates)
            result = generate_from_template(chosen, entity_mapping)
            if result:
                pid = row['person_id']
                if pid in train_ids: train_data.append(result)
                elif pid in val_ids: val_data.append(result)
                else: test_data.append(result)
                
        # Also occasionally use general templates
        if random.random() < 0.2:
            chosen_gen = random.choice(general_templates)
            result_gen = generate_from_template(chosen_gen, entity_mapping)
            if result_gen:
                pid = row['person_id']
                if pid in train_ids: train_data.append(result_gen)
                elif pid in val_ids: val_data.append(result_gen)
                else: test_data.append(result_gen)
                
    print(f"Train sentences: {len(train_data)}")
    print(f"Val sentences: {len(val_data)}")
    print(f"Test sentences: {len(test_data)}")
    
    # Save data
    os.makedirs("C:/Users/Giridharan/Genesis/ml/data", exist_ok=True)
    with open("C:/Users/Giridharan/Genesis/ml/data/ner_train.json", "w", encoding="utf-8") as f:
        json.dump(train_data, f, ensure_ascii=False)
    with open("C:/Users/Giridharan/Genesis/ml/data/ner_val.json", "w", encoding="utf-8") as f:
        json.dump(val_data, f, ensure_ascii=False)
    with open("C:/Users/Giridharan/Genesis/ml/data/ner_test.json", "w", encoding="utf-8") as f:
        json.dump(test_data, f, ensure_ascii=False)
        
    # Generate label map
    unique_tags = set()
    for d in train_data + val_data + test_data:
        unique_tags.update(d['ner_tags'])
        
    labels = sorted(list(unique_tags))
    if "O" in labels:
        labels.remove("O")
        labels.insert(0, "O")
        
    label_map = {label: i for i, label in enumerate(labels)}
    with open("C:/Users/Giridharan/Genesis/ml/data/ner_label_map.json", "w", encoding="utf-8") as f:
        json.dump(label_map, f, indent=2)
        
    print("Dataset generation complete.")

if __name__ == "__main__":
    main()
