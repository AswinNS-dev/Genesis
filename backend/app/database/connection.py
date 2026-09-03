import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config.settings import settings

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    # Ensure postgresql:// is used instead of postgres:// if needed
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        
    return create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    # Import all models to ensure they are registered with Base metadata
    try:
        import backend.app.database.models  # noqa
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[DB] Notice during table synchronization: {e}")

def get_db():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
