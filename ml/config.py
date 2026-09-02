import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# NER Configuration
NER_MODEL_NAME = os.getenv("NER_MODEL_NAME", "distilbert-base-uncased")
NER_MAX_LENGTH = int(os.getenv("NER_MAX_LENGTH", "128"))
NER_BATCH_SIZE = int(os.getenv("NER_BATCH_SIZE", "16"))
NER_LEARNING_RATE = float(os.getenv("NER_LEARNING_RATE", "2e-5"))
NER_EPOCHS = int(os.getenv("NER_EPOCHS", "3"))

# Paths
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"

NER_TRAIN_PATH = DATA_DIR / "ner_train.json"
NER_VAL_PATH = DATA_DIR / "ner_val.json"
NER_TEST_PATH = DATA_DIR / "ner_test.json"
NER_LABEL_MAP_PATH = DATA_DIR / "ner_label_map.json"

NER_MODEL_SAVE_PATH = MODELS_DIR / "ner"

# Entity Resolution Configuration
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
ENTITY_MATCH_THRESHOLD = float(os.getenv("ENTITY_MATCH_THRESHOLD", "0.85"))
ENTITY_REVIEW_THRESHOLD = float(os.getenv("ENTITY_REVIEW_THRESHOLD", "0.65"))

# Global Settings
RANDOM_SEED = int(os.getenv("RANDOM_SEED", "42"))
