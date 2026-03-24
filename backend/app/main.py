from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.ml.crowd_model import load_model
from app.routers import conditions, forecast, tides, crowd, ai, sun

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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

app.include_router(conditions.router, prefix="/api/v1")
app.include_router(forecast.router, prefix="/api/v1")
app.include_router(tides.router, prefix="/api/v1")
app.include_router(crowd.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(sun.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    from app.ml.crowd_model import _model
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "env": settings.app_env,
    }


@app.get("/")
async def root():
    return {"message": "Surf Forecast API", "docs": "/docs"}
