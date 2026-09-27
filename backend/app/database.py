import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()


# ============================================================
# MAIN DENTAL CLINIC DATABASE
# ============================================================

DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_PORT = os.getenv("DATABASE_PORT")
DATABASE_NAME = os.getenv("DATABASE_NAME")
DATABASE_USER = os.getenv("DATABASE_USER")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")


DATABASE_URL = (
    f"postgresql+psycopg2://{DATABASE_USER}:{DATABASE_PASSWORD}"
    f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
)


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


def get_db():
    """
    Main Dental Clinic database session.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# N8N / WHATSAPP CHAT MEMORY DATABASE
# ============================================================

N8N_DATABASE_NAME = os.getenv(
    "N8N_DATABASE_NAME",
    "postgres"
)


N8N_DATABASE_URL = (
    f"postgresql+psycopg2://{DATABASE_USER}:{DATABASE_PASSWORD}"
    f"@{DATABASE_HOST}:{DATABASE_PORT}/{N8N_DATABASE_NAME}"
)


n8n_engine = create_engine(
    N8N_DATABASE_URL,
    pool_pre_ping=True
)


N8NSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=n8n_engine
)


def get_n8n_db():
    """
    n8n PostgreSQL database session.

    Used only for reading WhatsApp AI chat memory.
    """

    db = N8NSessionLocal()

    try:
        yield db

    finally:
        db.close()