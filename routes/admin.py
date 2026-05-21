from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import ChatSession, Personality, User
from services.auth import create_token, get_current_user, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "session_count": len(u.sessions),
            "personality_count": len(u.personalities),
        }
        for u in users
    ]


class CreateUserBody(BaseModel):
    username: str
    password: str


@router.post("/users", status_code=201)
def create_user(
    body: CreateUserBody,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    username = body.username.strip()
    if len(username) < 3:
        raise HTTPException(status_code=422, detail="Username must be at least 3 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(username=username, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "session_count": 0,
        "personality_count": 0,
    }


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ── user sessions ─────────────────────────────────────────────────────────────

@router.get("/users/{user_id}/sessions")
def list_user_sessions(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "message_count": len(s.messages),
        }
        for s in sessions
    ]


@router.get("/users/{user_id}/sessions/{session_id}/messages")
def get_user_session_messages(
    user_id: str,
    session_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from models import Message
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [
        {
            "role": m.role,
            "content": m.content,
            "tool": m.tool,
            "error": m.error,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in session.messages
    ]


@router.delete("/users/{user_id}/sessions/{session_id}", status_code=204)
def delete_user_session(
    user_id: str,
    session_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()


# ── user personalities ────────────────────────────────────────────────────────

@router.get("/users/{user_id}/personalities")
def list_user_personalities(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Personality)
        .filter(Personality.user_id == user_id)
        .order_by(Personality.created_at)
        .all()
    )
    return [{"id": p.id, "name": p.name, "prompt": p.prompt} for p in items]


@router.delete("/users/{user_id}/personalities/{personality_id}", status_code=204)
def delete_user_personality(
    user_id: str,
    personality_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    p = (
        db.query(Personality)
        .filter(Personality.id == personality_id, Personality.user_id == user_id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Personality not found")
    db.delete(p)
    db.commit()
