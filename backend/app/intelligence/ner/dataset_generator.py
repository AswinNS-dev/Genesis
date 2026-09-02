import json
import random
from pathlib import Path
from backend.app.config.settings import settings

NAMES = ["Rahul Sharma", "Amit Kumar", "Suresh Verma", "Priya Singh", "Anjali Mehta", "Vikram Patel", "Ravi Teja", "Sunil Yadav"]
PHONES = ["9876543210", "9811223344", "8800112233", "9988776655", "7766554433", "9123456789"]
VEHICLES = ["DL01AB1234", "MH12DE5678", "KA05JK9999", "HR26BC0001", "UP16XY4321"]
LOCATIONS = ["Sector 18 Noida", "Connaught Place", "Bandra West", "Koramangala", "Cyber Hub Gurgaon", "Indiranagar"]
ORGS = ["ABC Logistics", "Apex Global", "Zenith Corp", "Nexus Enterprises", "Titan Trading"]
ACCOUNTS = ["SBIN0001234", "HDFC0005678", "ICIC0009999", "UTIB0004321"]

TEMPLATES = [
    ("Subject {name} was spotted driving {vehicle} near {loc}.", ["name", "vehicle", "loc"]),
    ("Intercepted call from {phone} registered to {name} discussing funds to {org}.", ["phone", "name", "org"]),
    ("Transaction of INR 500,000 sent from account {acc} owned by {name}.", ["acc", "name"]),
    ("Meeting scheduled at {loc} between {name} and associates from {org}.", ["loc", "name", "org"]),
    ("Target vehicle {vehicle} registered under {name} seen at {loc}.", ["vehicle", "name", "loc"]),
    ("Informant reported {name} operating under alias from {loc}, contact: {phone}.", ["name", "loc", "phone"]),
    ("{org} wire transferred money to account {acc} linked to {name}.", ["org", "acc", "name"]),
    ("Surveillance log: {name} arrived in {vehicle} at {loc} and dialed {phone}.", ["name", "vehicle", "loc", "phone"]),
]

TYPE_MAP = {
    "name": "PERSON",
    "phone": "PHONE",
    "vehicle": "VEHICLE",
    "loc": "LOCATION",
    "org": "ORGANIZATION",
    "acc": "ACCOUNT"
}

def generate_sample():
    template, placeholders = random.choice(TEMPLATES)
    values = {}
    if "name" in placeholders: values["name"] = random.choice(NAMES)
    if "phone" in placeholders: values["phone"] = random.choice(PHONES)
    if "vehicle" in placeholders: values["vehicle"] = random.choice(VEHICLES)
    if "loc" in placeholders: values["loc"] = random.choice(LOCATIONS)
    if "org" in placeholders: values["org"] = random.choice(ORGS)
    if "acc" in placeholders: values["acc"] = random.choice(ACCOUNTS)
    
    text = template.format(**values)
    
    entities = []
    for p in placeholders:
        val = values[p]
        start = text.find(val)
        end = start + len(val)
        entities.append({
            "start": start,
            "end": end,
            "label": TYPE_MAP[p],
            "text": val
        })
        
    return {"text": text, "entities": entities}

def generate_dataset(num_samples: int = 500):
    return [generate_sample() for _ in range(num_samples)]
