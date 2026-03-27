from __future__ import annotations
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError

from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.environ.get("SECRET_KEY", "swello-dev-secret-do-not-use-in-prod")
ALGORITHM  = "HS256"
TOKEN_DAYS = 60

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_\-]{3,20}$')


# ── Models ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    token: str
    username: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_token(username: str) -> str:
    exp = datetime.now(tz=timezone.utc) + timedelta(days=TOKEN_DAYS)
    return jwt.encode({"sub": username.lower(), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/check/{username}")
async def check_username(username: str):
    """Returns whether a username is available."""
    if not USERNAME_RE.match(username):
        return {"available": False, "reason": "invalid"}
    conn = get_db()
    row = conn.execute("SELECT 1 FROM users WHERE username = ?", (username.lower(),)).fetchone()
    conn.close()
    return {"available": row is None}


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    if not USERNAME_RE.match(req.username):
        raise HTTPException(400, "Username must be 3–20 characters: letters, numbers, _ or -")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    conn = get_db()
    existing = conn.execute("SELECT 1 FROM users WHERE username = ?", (req.username.lower(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(409, "Username already taken — try another one 🤙")

    pw_hash = _pwd.hash(req.password)
    conn.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                 (req.username.lower(), pw_hash))
    conn.commit()
    conn.close()

    return AuthResponse(token=_make_token(req.username), username=req.username.lower())


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (req.username.lower(),)).fetchone()
    conn.close()

    if not row or not _pwd.verify(req.password, row["password_hash"]):
        raise HTTPException(401, "Wrong username or password")

    return AuthResponse(token=_make_token(req.username), username=req.username.lower())


@router.get("/me")
async def me(username: str = Depends(get_current_user)):
    return {"username": username}
