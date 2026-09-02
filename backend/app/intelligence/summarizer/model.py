from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import torch

class InvestigationSummarizer:
    def __init__(self, model_name="google/flan-t5-small"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        
    def load(self, model_path):
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model.to(self.device)
        
    def summarize(self, text, max_length=150, min_length=40):
        self.model.eval()
        inputs = self.tokenizer("summarize: " + text, return_tensors="pt", max_length=512, truncation=True).to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                inputs.input_ids,
                max_length=max_length,
                min_length=min_length,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True
            )
            
        summary = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return summary
