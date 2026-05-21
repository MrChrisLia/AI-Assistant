from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./chat.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import ChatSession, Message, Personality  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate()
    _seed_admin()


def _seed_admin():
    from config import ADMIN_USERNAMES
    import os
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not ADMIN_USERNAMES or not password:
        return
    from models import User
    from services.auth import hash_password
    db = SessionLocal()
    try:
        for username in ADMIN_USERNAMES:
            if not db.query(User).filter(User.username == username).first():
                db.add(User(username=username, hashed_password=hash_password(password), is_admin=True))
                print(f"[init] Created admin account: {username}")
        db.commit()
    finally:
        db.close()


def _migrate():
    from sqlalchemy import text
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass
