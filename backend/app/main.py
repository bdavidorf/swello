from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.ml.crowd_model import load_model
from app.database import init_db
from app.routers import conditions, forecast, tides, crowd, ai, sun, swello_ai, pin, auth, friends

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    load_model()
    print("[startup] Crowd prediction model loaded.")
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="Surf Forecast API",
    version="1.0.0",
    description="AI-powered California surf forecasting using NOAA data.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# pin must be registered BEFORE conditions so /conditions/pin (literal)
# takes priority over /conditions/{spot_id} (parameterized)
app.include_router(auth.router, prefix="/v1")
app.include_router(pin.router, prefix="/v1")
app.include_router(conditions.router, prefix="/v1")
app.include_router(forecast.router, prefix="/v1")
app.include_router(tides.router, prefix="/v1")
app.include_router(crowd.router, prefix="/v1")
app.include_router(ai.router, prefix="/v1")
app.include_router(sun.router, prefix="/v1")
app.include_router(swello_ai.router, prefix="/v1")
app.include_router(friends.router, prefix="/v1")


@app.get("/v1/health")
async def health():
    import os
    from app.ml.crowd_model import _model
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "env": settings.app_env,
        "gemini_key": os.environ.get("GEMINI_API_KEY", "")[:8] or "NOT SET",
        "groq_key": os.environ.get("GROQ_API_KEY", "")[:8] or "NOT SET",
        "vercel_env": os.environ.get("VERCEL_ENV", "not set"),
    }


@app.get("/")
async def root():
    return {"message": "Surf Forecast API", "docs": "/docs"}
