from __future__ import annotations
"""
Open-Meteo Marine API — free, no key required.
Returns hourly wave/swell forecast for a lat/lon up to 7 days.
https://open-meteo.com/en/docs/marine-weather-api
"""

import httpx
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class MarineHour:
    timestamp: datetime          # local time (America/Los_Angeles)
    wave_height_m: Optional[float]     # total significant wave height (all components, RMS combined)
    wave_period_s: Optional[float]
    wave_direction_deg: Optional[float]
    swell_height_m: Optional[float]    # primary swell component only
    swell_period_s: Optional[float]
    swell_direction_deg: Optional[float]
    swell_height_2_m: Optional[float]  # secondary swell
    swell_period_2_s: Optional[float]
    swell_direction_2_deg: Optional[float]
    swell_height_3_m: Optional[float]  # tertiary swell
    swell_period_3_s: Optional[float]
    swell_direction_3_deg: Optional[float]
    wind_wave_height_m: Optional[float]   # wind-generated sea component
    wind_wave_dir_deg: Optional[float]
    wind_wave_period_s: Optional[float]


async def fetch_marine_forecast(lat: float, lon: float) -> list[MarineHour]:
    url = "https://marine-api.open-meteo.com/v1/marine"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "wave_height",
            "wave_period",
            "wave_direction",
            "swell_wave_height",
            "swell_wave_period",
            "swell_wave_direction",
            "swell_wave_height_2",
            "swell_wave_period_2",
            "swell_wave_direction_2",
            "swell_wave_height_3",
            "swell_wave_period_3",
            "swell_wave_direction_3",
            "wind_wave_height",
            "wind_wave_direction",
            "wind_wave_period",
        ]),
        "timezone": "America/Los_Angeles",
        "forecast_days": 14,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
        except Exception:
            return []

    data = resp.json()
    h = data.get("hourly", {})
    times = h.get("time", [])

    result: list[MarineHour] = []
    for i, t in enumerate(times):
        def _get(key: str) -> Optional[float]:
            val = h.get(key, [None])[i] if i < len(h.get(key, [])) else None
            return float(val) if val is not None else None

        result.append(MarineHour(
            timestamp=datetime.fromisoformat(t),
            wave_height_m=_get("wave_height"),
            wave_period_s=_get("wave_period"),
            wave_direction_deg=_get("wave_direction"),
            swell_height_m=_get("swell_wave_height"),
            swell_period_s=_get("swell_wave_period"),
            swell_direction_deg=_get("swell_wave_direction"),
            swell_height_2_m=_get("swell_wave_height_2"),
            swell_period_2_s=_get("swell_wave_period_2"),
            swell_direction_2_deg=_get("swell_wave_direction_2"),
            swell_height_3_m=_get("swell_wave_height_3"),
            swell_period_3_s=_get("swell_wave_period_3"),
            swell_direction_3_deg=_get("swell_wave_direction_3"),
            wind_wave_height_m=_get("wind_wave_height"),
            wind_wave_dir_deg=_get("wind_wave_direction"),
            wind_wave_period_s=_get("wind_wave_period"),
        ))

    return result
