import json
import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer
import os

class NERDataset(Dataset):
    def __init__(self, file_path, tokenizer, label_map, max_length=128):
        self.tokenizer = tokenizer
        self.label_map = label_map
        self.max_length = max_length
        
        with open(file_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
            
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        item = self.data[idx]
        tokens = item['tokens']
        ner_tags = item['ner_tags']
        
        # Convert tags to IDs
        label_ids = [self.label_map[tag] for tag in ner_tags]
        
        # Tokenize with is_split_into_words=True
        encoding = self.tokenizer(
            tokens,
            is_split_into_words=True,
            return_offsets_mapping=True,
            padding='max_length',
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt"
        )
        
        # Align labels
        word_ids = encoding.word_ids(batch_index=0)
        aligned_labels = []
        previous_word_idx = None
        
        for word_idx in word_ids:
            if word_idx is None:
                aligned_labels.append(-100) # Ignore special tokens
            elif word_idx != previous_word_idx:
                aligned_labels.append(label_ids[word_idx])
            else:
                # Subwords get -100 to only compute loss on the first word piece
                aligned_labels.append(-100)
            previous_word_idx = word_idx
            
        encoding = {k: v.squeeze(0) for k, v in encoding.items()}
        encoding['labels'] = torch.tensor(aligned_labels, dtype=torch.long)
        
        return encoding

def load_label_map(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)
