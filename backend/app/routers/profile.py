from __future__ import annotations
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.routers.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileRequest(BaseModel):
    skill_level: Optional[str] = None
    board_type: Optional[str] = None
    prefers_bigger: bool = False
    prefers_cleaner: bool = True
    prefers_uncrowded: bool = False


class ProfileResponse(BaseModel):
    skill_level: Optional[str] = None
    board_type: Optional[str] = None
    prefers_bigger: bool = False
    prefers_cleaner: bool = True
    prefers_uncrowded: bool = False


@router.get("", response_model=ProfileResponse)
async def get_profile(me: str = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM user_profiles WHERE username = ?", (me,)
    ).fetchone()
    conn.close()
    if not row:
        return ProfileResponse()
    return ProfileResponse(
        skill_level=row["skill_level"],
        board_type=row["board_type"],
        prefers_bigger=bool(row["prefers_bigger"]),
        prefers_cleaner=bool(row["prefers_cleaner"]),
        prefers_uncrowded=bool(row["prefers_uncrowded"]),
    )


@router.put("")
async def save_profile(req: ProfileRequest, me: str = Depends(get_current_user)):
    conn = get_db()
    conn.execute(
        """INSERT INTO user_profiles (username, skill_level, board_type, prefers_bigger, prefers_cleaner, prefers_uncrowded)
           VALUES (?,?,?,?,?,?)
           ON CONFLICT(username) DO UPDATE SET
             skill_level=excluded.skill_level,
             board_type=excluded.board_type,
             prefers_bigger=excluded.prefers_bigger,
             prefers_cleaner=excluded.prefers_cleaner,
             prefers_uncrowded=excluded.prefers_uncrowded""",
        (me, req.skill_level, req.board_type,
         int(req.prefers_bigger), int(req.prefers_cleaner), int(req.prefers_uncrowded)),
    )
    conn.commit()
    conn.close()
    return {"ok": True}
