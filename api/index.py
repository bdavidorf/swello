import sys
import os

# Add backend directory to path so FastAPI app can import its modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app  # noqa: F401 — Vercel uses this as the ASGI handler
