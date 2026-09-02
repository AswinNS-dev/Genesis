from typing import Dict, Any

def get_ner_model(model_name: str, num_labels: int, id2label: Dict[int, str], label2id: Dict[str, int]):
    try:
        from transformers import AutoModelForTokenClassification
        model = AutoModelForTokenClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            id2label=id2label,
            label2id=label2id
        )
        return model
    except ImportError:
        raise RuntimeError("Transformers library is required to initialize the neural NER model.")
