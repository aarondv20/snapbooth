from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema():
    """Auto-migrate existing databases by adding missing columns (SQLite only)."""
    if "sqlite" not in settings.DATABASE_URL:
        return
    migrations = [
        ("captured_images", "owner_ids", "owner_ids JSON"),
        ("photo_sessions", "participant_ids", "participant_ids JSON"),
        ("photo_sessions", "creator_id", "creator_id VARCHAR"),
    ]
    with engine.begin() as conn:
        for table, column, ddl in migrations:
            rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            existing = {row[1] for row in rows}
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def get_db():
    """FastAPI dependency that yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
