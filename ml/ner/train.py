import os
import json
import numpy as np
from transformers import AutoTokenizer, Trainer, TrainingArguments, EarlyStoppingCallback
import sys

# Add parent dir to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ner.dataset import NERDataset, load_label_map
from ner.model import get_ner_model
from ner.evaluate import compute_metrics
import config

def main():
    print(f"Loading tokenizer: {config.NER_MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(config.NER_MODEL_NAME)
    
    label_map = load_label_map(config.NER_LABEL_MAP_PATH)
    id2label = {i: label for label, i in label_map.items()}
    label2id = label_map
    
    print("Loading datasets...")
    # Limiting to 5000 train samples and 1000 val samples for reasonable local execution time
    train_dataset = NERDataset(config.NER_TRAIN_PATH, tokenizer, label_map, config.NER_MAX_LENGTH)
    val_dataset = NERDataset(config.NER_VAL_PATH, tokenizer, label_map, config.NER_MAX_LENGTH)
    test_dataset = NERDataset(config.NER_TEST_PATH, tokenizer, label_map, config.NER_MAX_LENGTH)
    
    # Slice datasets if they are too large to train locally in a reasonable time
    # This prevents timeouts while still producing real metrics
    if len(train_dataset) > 5000:
        train_dataset.data = train_dataset.data[:5000]
    if len(val_dataset) > 1000:
        val_dataset.data = val_dataset.data[:1000]
    if len(test_dataset) > 1000:
        test_dataset.data = test_dataset.data[:1000]
        
    print(f"Train size: {len(train_dataset)}, Val size: {len(val_dataset)}, Test size: {len(test_dataset)}")
    
    model = get_ner_model(config.NER_MODEL_NAME, len(label_map), id2label, label2id)
    
    training_args = TrainingArguments(
        output_dir=str(config.MODELS_DIR / "checkpoints"),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=config.NER_LEARNING_RATE,
        per_device_train_batch_size=config.NER_BATCH_SIZE,
        per_device_eval_batch_size=config.NER_BATCH_SIZE,
        num_train_epochs=1, # 1 epoch for local dev speed
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        seed=config.RANDOM_SEED
    )
    
    def compute_metrics_wrapper(p):
        predictions, labels = p
        predictions = np.argmax(predictions, axis=2)
        return compute_metrics(predictions, labels, id2label)
        
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics_wrapper,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
    )
    
    print("Starting training...")
    trainer.train()
    
    print("Evaluating on test set...")
    test_results = trainer.predict(test_dataset)
    test_metrics = compute_metrics_wrapper((test_results.predictions, test_results.label_ids))
    
    os.makedirs(config.REPORTS_DIR, exist_ok=True)
    with open(config.REPORTS_DIR / "ner_metrics.json", "w", encoding="utf-8") as f:
        json.dump(test_metrics, f, indent=2)
        
    print(f"Saving model to {config.NER_MODEL_SAVE_PATH}")
    trainer.save_model(str(config.NER_MODEL_SAVE_PATH))
    tokenizer.save_pretrained(str(config.NER_MODEL_SAVE_PATH))
    
    with open(config.REPORTS_DIR / "ner_classification_report.txt", "w", encoding="utf-8") as f:
        f.write("NER Classification Report\n")
        f.write("="*25 + "\n")
        f.write(f"Overall F1: {test_metrics['f1']:.4f}\n")
        f.write(f"Overall Precision: {test_metrics['precision']:.4f}\n")
        f.write(f"Overall Recall: {test_metrics['recall']:.4f}\n\n")
        f.write("Detailed per-class metrics:\n")
        for cls, metrics in test_metrics['detailed'].items():
            f.write(f"{cls}:\n")
            f.write(f"  F1: {metrics['f1']:.4f}\n")
            f.write(f"  Precision: {metrics['precision']:.4f}\n")
            f.write(f"  Recall: {metrics['recall']:.4f}\n")

if __name__ == "__main__":
    main()
