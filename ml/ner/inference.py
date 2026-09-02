import os
import sys
from transformers import pipeline
import torch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config

_ner_pipeline = None

def get_pipeline():
    global _ner_pipeline
    if _ner_pipeline is None:
        device = 0 if torch.cuda.is_available() else -1
        _ner_pipeline = pipeline(
            "token-classification",
            model=str(config.NER_MODEL_SAVE_PATH),
            tokenizer=str(config.NER_MODEL_SAVE_PATH),
            aggregation_strategy="simple",
            device=device
        )
    return _ner_pipeline

def extract_entities(text: str):
    nlp = get_pipeline()
    predictions = nlp(text)
    
    entities = []
    for pred in predictions:
        # aggregation_strategy="simple" returns entity_group
        label = pred.get("entity_group", pred.get("entity"))
        
        entities.append({
            "text": pred["word"],
            "label": label,
            "start": pred["start"],
            "end": pred["end"],
            "confidence": float(pred["score"])
        })
        
    return {
        "text": text,
        "entities": entities
    }
