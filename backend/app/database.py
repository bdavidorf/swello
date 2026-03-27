from __future__ import annotations
import os
import sqlite3
from pathlib import Path
from typing import Any, Sequence

# ── Database mode ─────────────────────────────────────────────────────────────
# Supabase Vercel integration injects POSTGRES_URL_NON_POOLING (preferred for
# psycopg2 — direct connection, no pooler).  Falls back to POSTGRES_URL, then
# DATABASE_URL (Neon / manual), then SQLite for local development.
DATABASE_URL = (
    os.environ.get("POSTGRES_URL_NON_POOLING")
    or os.environ.get("POSTGRES_URL")
    or os.environ.get("DATABASE_URL")
)

_IS_VERCEL = bool(os.environ.get("VERCEL_ENV"))
DB_PATH = Path("/tmp/swello_users.db") if _IS_VERCEL else Path(__file__).parent / "data" / "users.db"


def _to_pg(sql: str) -> str:
    """Convert SQLite ? placeholders to PostgreSQL %s."""
    return sql.replace('?', '%s')


class DbConn:
    """Unified connection wrapper normalizing SQLite and PostgreSQL interfaces."""

    def __init__(self):
        if DATABASE_URL:
            import psycopg2
            import psycopg2.extras
            self._raw = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
            self._pg = True
        else:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            self._raw = sqlite3.connect(str(DB_PATH), check_same_thread=False)
            self._raw.row_factory = sqlite3.Row
            self._raw.execute("PRAGMA journal_mode=WAL")
            self._pg = False

    def execute(self, sql: str, params: Sequence[Any] = ()):
        if self._pg:
            sql = _to_pg(sql)
        cur = self._raw.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._raw.commit()

    def close(self):
        try:
            self._raw.close()
        except Exception:
            pass


def get_db() -> DbConn:
    return DbConn()


# ── Schema ────────────────────────────────────────────────────────────────────

_SQLITE_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS friendships (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        requester  TEXT NOT NULL,
        addressee  TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester, addressee)
    )""",
    """CREATE TABLE IF NOT EXISTS surf_sessions (
        username   TEXT PRIMARY KEY,
        spot_id    TEXT NOT NULL,
        spot_name  TEXT NOT NULL,
        lat        REAL NOT NULL,
        lon        REAL NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS user_profiles (
        username          TEXT PRIMARY KEY,
        skill_level       TEXT,
        board_type        TEXT,
        prefers_bigger    INTEGER DEFAULT 0,
        prefers_cleaner   INTEGER DEFAULT 1,
        prefers_uncrowded INTEGER DEFAULT 0,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
]

_PG_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS friendships (
        id         SERIAL PRIMARY KEY,
        requester  TEXT NOT NULL,
        addressee  TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(requester, addressee)
    )""",
    """CREATE TABLE IF NOT EXISTS surf_sessions (
        username   TEXT PRIMARY KEY,
        spot_id    TEXT NOT NULL,
        spot_name  TEXT NOT NULL,
        lat        DOUBLE PRECISION NOT NULL,
        lon        DOUBLE PRECISION NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS user_profiles (
        username          TEXT PRIMARY KEY,
        skill_level       TEXT,
        board_type        TEXT,
        prefers_bigger    INTEGER DEFAULT 0,
        prefers_cleaner   INTEGER DEFAULT 1,
        prefers_uncrowded INTEGER DEFAULT 0,
        updated_at        TIMESTAMPTZ DEFAULT NOW()
    )""",
]


def init_db() -> None:
    conn = get_db()
    schema = _PG_SCHEMA if DATABASE_URL else _SQLITE_SCHEMA
    for stmt in schema:
        conn.execute(stmt)
    conn.commit()
    conn.close()
    mode = f"PostgreSQL ({DATABASE_URL[:30]}...)" if DATABASE_URL else f"SQLite @ {DB_PATH}"
    print(f"[db] DB ready ({mode})")


# Run on import so tables exist before the first request on cold starts
try:
    init_db()
except Exception as _e:
    print(f"[db] init_db on import failed (will retry on first request): {_e}")
