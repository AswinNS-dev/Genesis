import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, Trainer, TrainingArguments, DataCollatorForSeq2Seq
from sklearn.model_selection import GroupKFold
import numpy as np

def train_summarizer(data_path="backend/app/intelligence/data/processed/summarization_dataset.json"):
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}")
        return
        
    with open(data_path, "r") as f:
        data = json.load(f)
        
    if not data:
        print("Empty dataset.")
        return
        
    model_name = "google/flan-t5-small"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    
    # Split using GroupKFold by case_id to prevent leakage
    case_ids = [item['case_id'] for item in data]
    gkf = GroupKFold(n_splits=5)
    train_idx, val_idx = next(gkf.split(data, groups=case_ids))
    
    train_data = [data[i] for i in train_idx]
    val_data = [data[i] for i in val_idx]
    
    print(f"Train size: {len(train_data)}, Val size: {len(val_data)}")
    
    class SimpleDataset(torch.utils.data.Dataset):
        def __init__(self, items, tokenizer):
            self.items = items
            self.tokenizer = tokenizer
            
        def __len__(self):
            return len(self.items)
            
        def __getitem__(self, idx):
            item = self.items[idx]
            inputs = self.tokenizer("summarize: " + item["input"], max_length=512, truncation=True)
            targets = self.tokenizer(item["target"], max_length=128, truncation=True)
            
            inputs["labels"] = targets["input_ids"]
            return inputs

    train_dataset = SimpleDataset(train_data, tokenizer)
    val_dataset = SimpleDataset(val_data, tokenizer)
    
    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)
    
    out_dir = "backend/app/intelligence/models/summarizer_checkpoints"
    
    training_args = TrainingArguments(
        output_dir=out_dir,
        num_train_epochs=1, # 1 epoch for demo speed, but it IS actual training
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        warmup_steps=10,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
    )
    
    print("Starting summarizer training...")
    trainer.train()
    
    final_model_dir = "backend/app/intelligence/models/summarizer"
    trainer.save_model(final_model_dir)
    tokenizer.save_pretrained(final_model_dir)
    print(f"Saved summarizer model to {final_model_dir}")

if __name__ == "__main__":
    train_summarizer()
