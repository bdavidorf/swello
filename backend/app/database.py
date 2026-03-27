from __future__ import annotations
import sqlite3
import os
from pathlib import Path

# On Vercel the filesystem outside /tmp is read-only, so put the DB in /tmp.
# Locally we persist it alongside the app data so users survive restarts.
_IS_VERCEL = bool(os.environ.get("VERCEL_ENV"))
DB_PATH = Path("/tmp/swello_users.db") if _IS_VERCEL else Path(__file__).parent / "data" / "users.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT    NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print(f"[db] Users DB ready at {DB_PATH}")
