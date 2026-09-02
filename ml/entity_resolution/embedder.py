import os
import sys
from sentence_transformers import SentenceTransformer, util
import torch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config

_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        _embedder = SentenceTransformer(config.EMBEDDING_MODEL_NAME, device=device)
    return _embedder

def compute_semantic_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    model = get_embedder()
    emb1 = model.encode(text1, convert_to_tensor=True)
    emb2 = model.encode(text2, convert_to_tensor=True)
    cosine_scores = util.cos_sim(emb1, emb2)
    return float(cosine_scores[0][0])
