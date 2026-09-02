import os
import re
from typing import List, Dict, Any, Optional
from backend.app.config.settings import settings

_ner_pipeline = None

def _get_transformer_pipeline():
    global _ner_pipeline
    if _ner_pipeline is None:
        try:
            import torch
            from transformers import pipeline
            if os.path.exists(settings.NER_MODEL_SAVE_PATH) and any(os.scandir(settings.NER_MODEL_SAVE_PATH)):
                device = 0 if torch.cuda.is_available() else -1
                _ner_pipeline = pipeline(
                    "token-classification",
                    model=settings.NER_MODEL_SAVE_PATH,
                    tokenizer=settings.NER_MODEL_SAVE_PATH,
                    aggregation_strategy="simple",
                    device=device
                )
        except Exception:
            _ner_pipeline = False
    return _ner_pipeline if _ner_pipeline is not False else None

class NERService:
    def __init__(self):
        self.known_people = ["Rahul Kumar", "Amit Sharma", "Suresh Verma", "Priya Singh", "Arjun Mehta", "Vikram Patel", "Ravi Kumar"]
        self.known_locations = ["Sector 18", "Central Market", "Industrial Area", "Vasant Vihar", "Noida", "South Delhi"]
        self.known_orgs = ["ABC Logistics", "Sharma Pharma", "Mehta Imports", "Silverline Traders"]

    def extract(self, text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return {"text": text, "entities": []}

        # 1. Try Neural Transformer Pipeline
        nlp = _get_transformer_pipeline()
        if nlp:
            try:
                predictions = nlp(text)
                entities = []
                for pred in predictions:
                    label = pred.get("entity_group", pred.get("entity", "ENTITY"))
                    entities.append({
                        "text": pred.get("word", ""),
                        "label": label,
                        "start": pred.get("start", 0),
                        "end": pred.get("end", 0),
                        "confidence": round(float(pred.get("score", 0.90)), 4)
                    })
                if entities:
                    return {"text": text, "entities": entities}
            except Exception:
                pass

        # 2. Rule-Based & Pattern Extractor Fallback
        entities = []
        lower_text = text.lower()

        # People extraction
        for person in self.known_people:
            idx = lower_text.find(person.lower())
            if idx != -1:
                entities.append({
                    "text": person,
                    "label": "PERSON",
                    "start": idx,
                    "end": idx + len(person),
                    "confidence": 0.95
                })

        # Phone numbers (Indian/Standard 10-12 digits)
        phone_matches = re.finditer(r'(?:\+91[\-\s]?)?[6-9]\d{9}', text)
        for m in phone_matches:
            entities.append({
                "text": m.group(),
                "label": "PHONE",
                "start": m.start(),
                "end": m.end(),
                "confidence": 0.98
            })

        # Vehicle plates (e.g. DL-01-AB-1234 or DL01AB1234)
        vehicle_matches = re.finditer(r'[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}', text, re.IGNORECASE)
        for m in vehicle_matches:
            entities.append({
                "text": m.group().upper(),
                "label": "VEHICLE",
                "start": m.start(),
                "end": m.end(),
                "confidence": 0.96
            })

        # Organizations
        for org in self.known_orgs:
            idx = lower_text.find(org.lower())
            if idx != -1:
                entities.append({
                    "text": org,
                    "label": "ORGANIZATION",
                    "start": idx,
                    "end": idx + len(org),
                    "confidence": 0.90
                })

        # Locations
        for loc in self.known_locations:
            idx = lower_text.find(loc.lower())
            if idx != -1:
                entities.append({
                    "text": loc,
                    "label": "LOCATION",
                    "start": idx,
                    "end": idx + len(loc),
                    "confidence": 0.88
                })

        # Financial Amounts (e.g. INR 50,000 or Rs. 2,00,000)
        amt_matches = re.finditer(r'(?:INR|Rs\.?|₹)\s?[\d,]+(?:\.\d{2})?', text, re.IGNORECASE)
        for m in amt_matches:
            entities.append({
                "text": m.group(),
                "label": "AMOUNT",
                "start": m.start(),
                "end": m.end(),
                "confidence": 0.92
            })

        return {
            "text": text,
            "entities": entities
        }

ner_service = NERService()
