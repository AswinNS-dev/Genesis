import os
import math
from typing import Optional
from backend.app.config.settings import settings

_embedder = None

def _token_cosine_similarity(text1: str, text2: str) -> float:
    tokens1 = set(text1.lower().split())
    tokens2 = set(text2.lower().split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    return float(len(intersection) / (math.sqrt(len(tokens1)) * math.sqrt(len(tokens2))))

def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            # Only load if local cache exists or explicit flag enabled
            if os.getenv("ENABLE_NEURAL_EMBEDDINGS", "false").lower() == "true":
                from sentence_transformers import SentenceTransformer
                import torch
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                _embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME, device=device)
            else:
                _embedder = False
        except Exception:
            _embedder = False
    return _embedder if _embedder is not False else None

def compute_semantic_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    
    # 1. Try Deep Learning SentenceTransformer if active
    model = _get_embedder()
    if model:
        try:
            from sentence_transformers import util
            emb1 = model.encode(text1, convert_to_tensor=True)
            emb2 = model.encode(text2, convert_to_tensor=True)
            cosine_scores = util.cos_sim(emb1, emb2)
            return float(cosine_scores[0][0])
        except Exception:
            pass

    # 2. Fast Token-Cosine Similarity
    return _token_cosine_similarity(text1, text2)
