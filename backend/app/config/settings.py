import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Search and load .env from current directory, parent directory, or Genesis-2 root
base_dir = Path(__file__).resolve().parent.parent.parent
env_paths = [
    Path.cwd() / ".env",
    base_dir / ".env",
    base_dir.parent / ".env"
]
for p in env_paths:
    if p.exists():
        load_dotenv(p, override=False)

class Settings(BaseSettings):
    APP_NAME: str = "CrimeIntel"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = ""
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
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://ktzzlqekrycezqtghhpt.supabase.co")
    SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0enpscWVrcnljZXpxdGdoaHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTgzNjUsImV4cCI6MjEwMzg5NDM2NX0.bbsh93pQPrSLezW_RlKfIar8GtQVcPodNvaJe19no-A")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0enpscWVrcnljZXpxdGdoaHB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODMxODM2NSwiZXhwIjoyMTAzODk0MzY1fQ.SlUga2TMUyjfBQC2Ds4SgGvB0mpBIEAhZP0mgdKPcwg")
    SUPABASE_STORAGE_BUCKET: str = "crimeintel-evidence"
    STORAGE_DRIVER: str = "local"

    class Config:
        env_file = [".env", "../.env"]
        extra = "allow"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.NER_MODEL_SAVE_PATH, exist_ok=True)
