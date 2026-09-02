from transformers import AutoModelForTokenClassification

def get_ner_model(model_name, num_labels, id2label, label2id):
    model = AutoModelForTokenClassification.from_pretrained(
        model_name,
        num_labels=num_labels,
        id2label=id2label,
        label2id=label2id
    )
    return model
