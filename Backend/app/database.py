import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./subsaver.db")


def create_db_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_engine(url, connect_args=connect_args)


engine = None
try:
    temp_engine = create_db_engine(DATABASE_URL)
    # Test connection
    with temp_engine.connect() as conn:
        pass
    engine = temp_engine
except Exception as e:
    print(f"Notice: PostgreSQL connection failed: {e}")
    print("Falling back to local SQLite database (sqlite:///./subsaver.db)...")
    DATABASE_URL = "sqlite:///./subsaver.db"
    engine = create_db_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()