from __future__ import annotations
from pydantic_settings import BaseSettings
from functools import lru_cache
import json
import os
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    google_places_api_key: str = ""
    surfline_email: str = ""
    surfline_password: str = ""
    app_env: str = "development"
    cors_origins: list[str] = ["*"]

    # NOAA endpoints
    ndbc_base_url: str = "https://www.ndbc.noaa.gov/data/realtime2"
    coops_base_url: str = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
    nws_base_url: str = "https://api.weather.gov"

    # Cache TTLs (seconds)
    buoy_cache_ttl: int = 120       # 2 min
    nws_cache_ttl: int = 1800       # 30 min
    tides_cache_ttl: int = 21600    # 6 hours

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


DATA_DIR = Path(__file__).parent / "data"


@lru_cache()
def get_spots() -> list[dict]:
    with open(DATA_DIR / "us_spots.json") as f:
        return json.load(f)


def get_spot_by_id(spot_id: str) -> Optional[dict]:
    return next((s for s in get_spots() if s["id"] == spot_id), None)
