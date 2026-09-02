import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "CrimeIntel"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = "crimeintel-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    DATABASE_URL: str = "sqlite:///./dev.db"
    UPLOAD_DIR: str = "./public/uploads"
    AI_MODE: str = "mock"
    AI_API_KEY: Optional[str] = None

    # ML & Intelligence Configuration
    NER_MODEL_NAME: str = "distilbert-base-uncased"
    NER_MAX_LENGTH: int = 128
    NER_BATCH_SIZE: int = 16
    NER_MODEL_SAVE_PATH: str = "./backend/app/intelligence/models/ner"
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    ENTITY_MATCH_THRESHOLD: float = 0.85
    ENTITY_REVIEW_THRESHOLD: float = 0.65

    # Cloud Storage & Database (Supabase)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_STORAGE_BUCKET: str = "crimeintel-evidence"
    STORAGE_DRIVER: str = "local"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.NER_MODEL_SAVE_PATH, exist_ok=True)
