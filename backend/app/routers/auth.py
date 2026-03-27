from __future__ import annotations
"""
Auth endpoints — zero third-party dependencies.
Password hashing: stdlib hashlib.pbkdf2_hmac (PBKDF2-SHA256, 260k rounds)
Tokens: stdlib hmac + base64 + json (signed, expiry-checked)
"""
import os
import re
import hmac
import json
import time
import base64
import hashlib

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.environ.get("SECRET_KEY", "swello-dev-secret-change-in-prod").encode()
TOKEN_SECONDS = 60 * 24 * 3600  # 60 days

_bearer = HTTPBearer(auto_error=False)
USERNAME_RE = re.compile(r'^[a-zA-Z0-9_\-]{3,20}$')


# ── Password hashing (PBKDF2-SHA256) ─────────────────────────────────────────

def _hash_pw(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 260_000)
    return base64.b64encode(salt + dk).decode()


def _verify_pw(password: str, stored: str) -> bool:
    try:
        raw = base64.b64decode(stored.encode())
        salt, dk = raw[:16], raw[16:]
        test = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 260_000)
        return hmac.compare_digest(dk, test)
    except Exception:
        return False


# ── Token (HMAC-SHA256 signed JSON) ──────────────────────────────────────────

def _make_token(username: str) -> str:
    payload = json.dumps({"sub": username.lower(), "exp": int(time.time()) + TOKEN_SECONDS})
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')
    sig = hmac.new(SECRET_KEY, payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _verify_token(token: str) -> str | None:
    try:
        payload_b64, sig = token.rsplit('.', 1)
        expected = hmac.new(SECRET_KEY, payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        padding = (4 - len(payload_b64) % 4) % 4
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + '=' * padding))
        if payload['exp'] < time.time():
            return None
        return payload['sub']
    except Exception:
        return None


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


# ── Auth dependency ───────────────────────────────────────────────────────────

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    username = _verify_token(creds.credentials)
    if not username:
        raise HTTPException(401, "Invalid or expired token")
    return username


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/check/{username}")
async def check_username(username: str):
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

    pw_hash = _hash_pw(req.password)
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

    if not row or not _verify_pw(req.password, row["password_hash"]):
        raise HTTPException(401, "Wrong username or password")

    return AuthResponse(token=_make_token(req.username), username=req.username.lower())


@router.get("/me")
async def me(username: str = Depends(get_current_user)):
    return {"username": username}
