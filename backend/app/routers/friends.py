from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.database import get_db
from app.routers.auth import get_current_user

router = APIRouter(prefix="/friends", tags=["friends"])


# ── Models ────────────────────────────────────────────────────────────────────

class FriendOut(BaseModel):
    username: str
    status: str          # 'accepted' | 'pending_sent' | 'pending_received'
    surfing: Optional[SurfSessionOut] = None

class SurfSessionOut(BaseModel):
    spot_id:    str
    spot_name:  str
    lat:        float
    lon:        float
    started_at: str

class SetSessionRequest(BaseModel):
    spot_id:   str
    spot_name: str
    lat:       float
    lon:       float

FriendOut.model_rebuild()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_session(conn, username: str) -> Optional[SurfSessionOut]:
    row = conn.execute(
        "SELECT * FROM surf_sessions WHERE username = ? AND expires_at > ?",
        (username.lower(), datetime.now(tz=timezone.utc).isoformat()),
    ).fetchone()
    if not row:
        return None
    return SurfSessionOut(
        spot_id=row["spot_id"],
        spot_name=row["spot_name"],
        lat=row["lat"],
        lon=row["lon"],
        started_at=row["started_at"],
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/request/{to_user}", status_code=201)
async def send_request(to_user: str, me: str = Depends(get_current_user)):
    to_user = to_user.lower()
    if to_user == me:
        raise HTTPException(400, "Can't friend yourself")
    conn = get_db()
    # Check target user exists
    target = conn.execute("SELECT 1 FROM users WHERE username = ?", (to_user,)).fetchone()
    if not target:
        conn.close()
        raise HTTPException(404, "User not found")
    # Check if relationship already exists in either direction
    existing = conn.execute(
        "SELECT status FROM friendships WHERE (requester=? AND addressee=?) OR (requester=? AND addressee=?)",
        (me, to_user, to_user, me),
    ).fetchone()
    if existing:
        conn.close()
        if existing["status"] == "accepted":
            raise HTTPException(409, "Already friends")
        raise HTTPException(409, "Request already pending")
    conn.execute(
        "INSERT INTO friendships (requester, addressee, status) VALUES (?,?,'pending')",
        (me, to_user),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.post("/accept/{from_user}")
async def accept_request(from_user: str, me: str = Depends(get_current_user)):
    from_user = from_user.lower()
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM friendships WHERE requester=? AND addressee=? AND status='pending'",
        (from_user, me),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "No pending request from that user")
    conn.execute("UPDATE friendships SET status='accepted' WHERE id=?", (row["id"],))
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/remove/{username}")
async def remove_friend(username: str, me: str = Depends(get_current_user)):
    username = username.lower()
    conn = get_db()
    conn.execute(
        "DELETE FROM friendships WHERE (requester=? AND addressee=?) OR (requester=? AND addressee=?)",
        (me, username, username, me),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/list", response_model=list[FriendOut])
async def list_friends(me: str = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        """SELECT requester, addressee, status FROM friendships
           WHERE (requester=? OR addressee=?)""",
        (me, me),
    ).fetchall()
    result = []
    for row in rows:
        is_mine = row["requester"] == me
        other = row["addressee"] if is_mine else row["requester"]
        if row["status"] == "accepted":
            status = "accepted"
        elif is_mine:
            status = "pending_sent"
        else:
            status = "pending_received"
        session = _get_session(conn, other)
        result.append(FriendOut(username=other, status=status, surfing=session))
    conn.close()
    return result


@router.get("/requests", response_model=list[str])
async def pending_requests(me: str = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        "SELECT requester FROM friendships WHERE addressee=? AND status='pending'", (me,)
    ).fetchall()
    conn.close()
    return [r["requester"] for r in rows]


@router.put("/session")
async def set_session(req: SetSessionRequest, me: str = Depends(get_current_user)):
    expires = (datetime.now(tz=timezone.utc) + timedelta(hours=8)).isoformat()
    conn = get_db()
    conn.execute(
        """INSERT INTO surf_sessions (username, spot_id, spot_name, lat, lon, expires_at)
           VALUES (?,?,?,?,?,?)
           ON CONFLICT(username) DO UPDATE SET
             spot_id=excluded.spot_id, spot_name=excluded.spot_name,
             lat=excluded.lat, lon=excluded.lon,
             started_at=CURRENT_TIMESTAMP, expires_at=excluded.expires_at""",
        (me, req.spot_id, req.spot_name, req.lat, req.lon, expires),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "expires_at": expires}


@router.delete("/session")
async def clear_session(me: str = Depends(get_current_user)):
    conn = get_db()
    conn.execute("DELETE FROM surf_sessions WHERE username=?", (me,))
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/my-session", response_model=Optional[SurfSessionOut])
async def my_session(me: str = Depends(get_current_user)):
    conn = get_db()
    session = _get_session(conn, me)
    conn.close()
    return session
