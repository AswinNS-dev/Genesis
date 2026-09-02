from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config.settings import settings

db_url = settings.DATABASE_URL
if db_url.startswith("file:"):
    db_url = "sqlite:///" + db_url.replace("file:", "")

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import backend.app.database.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
