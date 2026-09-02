import json
import torch
from torch.utils.data import Dataset

class SummarizationDataset(Dataset):
    def __init__(self, data_path, tokenizer, max_input_length=512, max_target_length=128):
        with open(data_path, "r") as f:
            self.data = json.load(f)
        self.tokenizer = tokenizer
        self.max_input_length = max_input_length
        self.max_target_length = max_target_length
        
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        item = self.data[idx]
        
        inputs = self.tokenizer(
            "summarize: " + item["input"], 
            max_length=self.max_input_length, 
            padding="max_length", 
            truncation=True, 
            return_tensors="pt"
        )
        
        targets = self.tokenizer(
            item["target"], 
            max_length=self.max_target_length, 
            padding="max_length", 
            truncation=True, 
            return_tensors="pt"
        )
        
        input_ids = inputs.input_ids.squeeze()
        attention_mask = inputs.attention_mask.squeeze()
        labels = targets.input_ids.squeeze()
        
        # Replace padding token id's of the labels by -100 so it's ignored by the loss
        labels[labels == self.tokenizer.pad_token_id] = -100
        
        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "labels": labels,
            "case_id": item["case_id"] # useful for splitting
        }
