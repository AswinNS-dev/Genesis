import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score
from collections import defaultdict

def extract_entities(tags):
    entities = []
    current_entity = None
    
    for i, tag in enumerate(tags):
        if tag.startswith("B-"):
            if current_entity:
                entities.append(current_entity)
            current_entity = {"label": tag[2:], "start": i, "end": i}
        elif tag.startswith("I-"):
            if current_entity and current_entity["label"] == tag[2:] and current_entity["end"] == i - 1:
                current_entity["end"] = i
            else:
                if current_entity:
                    entities.append(current_entity)
                current_entity = {"label": tag[2:], "start": i, "end": i}
        else:
            if current_entity:
                entities.append(current_entity)
                current_entity = None
                
    if current_entity:
        entities.append(current_entity)
        
    return entities

def compute_metrics(predictions, labels, id2label):
    # Remove -100 (ignored tokens)
    true_predictions = [
        [id2label[p] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    true_labels = [
        [id2label[l] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    
    true_entities = []
    pred_entities = []
    
    for i, (t_tags, p_tags) in enumerate(zip(true_labels, true_predictions)):
        t_ents = extract_entities(t_tags)
        p_ents = extract_entities(p_tags)
        
        for ent in t_ents:
            true_entities.append(f"{i}-{ent['start']}-{ent['end']}-{ent['label']}")
        for ent in p_ents:
            pred_entities.append(f"{i}-{ent['start']}-{ent['end']}-{ent['label']}")
            
    true_entities = set(true_entities)
    pred_entities = set(pred_entities)
    
    tp = len(true_entities.intersection(pred_entities))
    fp = len(pred_entities - true_entities)
    fn = len(true_entities - pred_entities)
    
    precision = tp / (tp + fp) if tp + fp > 0 else 0.0
    recall = tp / (tp + fn) if tp + fn > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall > 0 else 0.0
    
    # Per-class metrics
    class_metrics = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
    for ent in true_entities:
        label = ent.split("-")[-1]
        if ent in pred_entities:
            class_metrics[label]["tp"] += 1
        else:
            class_metrics[label]["fn"] += 1
            
    for ent in pred_entities:
        if ent not in true_entities:
            label = ent.split("-")[-1]
            class_metrics[label]["fp"] += 1
            
    detailed_metrics = {}
    for label, counts in class_metrics.items():
        p = counts["tp"] / (counts["tp"] + counts["fp"]) if counts["tp"] + counts["fp"] > 0 else 0.0
        r = counts["tp"] / (counts["tp"] + counts["fn"]) if counts["tp"] + counts["fn"] > 0 else 0.0
        f = 2 * p * r / (p + r) if p + r > 0 else 0.0
        detailed_metrics[label] = {"precision": p, "recall": r, "f1": f}
        
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "detailed": detailed_metrics
    }
