from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Personality, User
from services.auth import get_current_user

router = APIRouter(prefix="/personalities", tags=["personalities"])

_DEFAULTS = [
    {"name": "Cybersecurity Expert", "prompt": "You are a helpful cybersecurity AI assistant. Answer questions clearly and concisely."},
    {"name": "Friendly Assistant", "prompt": "You are a friendly, warm, and helpful AI assistant. Be conversational and supportive."},
    {"name": "Concise Expert", "prompt": "You are an expert assistant. Give brief, direct answers. Use bullet points over paragraphs when possible. No preamble."},
]


def _serialize(p: Personality) -> dict:
    return {"id": p.id, "name": p.name, "prompt": p.prompt}


@router.get("")
def list_personalities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Personality)
        .filter(Personality.user_id == current_user.id)
        .order_by(Personality.created_at)
        .all()
    )
    if not items:
        for d in _DEFAULTS:
            db.add(Personality(user_id=current_user.id, name=d["name"], prompt=d["prompt"]))
        db.commit()
        items = (
            db.query(Personality)
            .filter(Personality.user_id == current_user.id)
            .order_by(Personality.created_at)
            .all()
        )
    return [_serialize(p) for p in items]


class PersonalityBody(BaseModel):
    name: str
    prompt: str


@router.post("", status_code=201)
def create_personality(
    body: PersonalityBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = Personality(user_id=current_user.id, name=body.name.strip() or "Unnamed", prompt=body.prompt)
    db.add(p)
    db.commit()
    db.refresh(p)
    return _serialize(p)


@router.put("/{personality_id}")
def update_personality(
    personality_id: str,
    body: PersonalityBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = (
        db.query(Personality)
        .filter(Personality.id == personality_id, Personality.user_id == current_user.id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Personality not found")
    p.name = body.name.strip() or "Unnamed"
    p.prompt = body.prompt
    db.commit()
    db.refresh(p)
    return _serialize(p)


@router.delete("/{personality_id}", status_code=204)
def delete_personality(
    personality_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = (
        db.query(Personality)
        .filter(Personality.id == personality_id, Personality.user_id == current_user.id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Personality not found")
    db.delete(p)
    db.commit()
