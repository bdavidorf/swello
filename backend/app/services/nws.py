from __future__ import annotations
"""
NOAA National Weather Service API.
Two-step fetch: points endpoint -> gridpoint hourly forecast.
NWS grid lookups are cached to disk to avoid repeated points calls.
"""

import httpx
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from app.config import get_settings

settings = get_settings()
GRID_CACHE_PATH = Path(__file__).parent.parent / "data" / "nws_grid_cache.json"


def _load_grid_cache() -> dict:
    if GRID_CACHE_PATH.exists():
        return json.loads(GRID_CACHE_PATH.read_text())
    return {}


def _save_grid_cache(cache: dict):
    GRID_CACHE_PATH.write_text(json.dumps(cache, indent=2))


async def _get_grid(lat: float, lon: float) -> Optional[dict]:
    """Returns {"office": "LOX", "gridX": 150, "gridY": 55} for a lat/lon."""
    cache = _load_grid_cache()
    key = f"{round(lat, 3)},{round(lon, 3)}"
    if key in cache:
        return cache[key]

    async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "surf-forecast-app/1.0"}) as client:
        try:
            resp = await client.get(f"{settings.nws_base_url}/points/{lat},{lon}")
            resp.raise_for_status()
            data = resp.json()["properties"]
            grid = {
                "office": data["cwa"],
                "gridX": data["gridX"],
                "gridY": data["gridY"],
                "forecast_hourly_url": data["forecastHourly"],
            }
            cache[key] = grid
            _save_grid_cache(cache)
            return grid
        except Exception:
            return None


class NWSHourlyPoint:
    def __init__(self, timestamp: datetime, wind_speed_mph: float, wind_dir: str,
                 temp_f: float, short_forecast: str):
        self.timestamp = timestamp
        self.wind_speed_mph = wind_speed_mph
        self.wind_dir = wind_dir
        self.temp_f = temp_f
        self.short_forecast = short_forecast


async def fetch_hourly_forecast(lat: float, lon: float) -> list[NWSHourlyPoint]:
    grid = await _get_grid(lat, lon)
    if not grid:
        return []

    async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "surf-forecast-app/1.0"}) as client:
        try:
            resp = await client.get(grid["forecast_hourly_url"])
            resp.raise_for_status()
        except Exception:
            return []

    periods = resp.json().get("properties", {}).get("periods", [])
    results = []
    for p in periods:
        try:
            ts = datetime.fromisoformat(p["startTime"])
            # wind speed: "15 mph" or "10 to 15 mph" → take max
            wspd_raw = p.get("windSpeed", "0 mph")
            if "to" in wspd_raw:
                wspd = float(wspd_raw.split("to")[-1].replace("mph", "").strip())
            else:
                wspd = float(wspd_raw.replace("mph", "").strip())
            results.append(NWSHourlyPoint(
                timestamp=ts,
                wind_speed_mph=wspd,
                wind_dir=p.get("windDirection", "N"),
                temp_f=p.get("temperature", 65),
                short_forecast=p.get("shortForecast", ""),
            ))
        except Exception:
            continue

    return results
