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
    swell_height_m: Optional[float]    # primary swell component
    swell_period_s: Optional[float]
    swell_direction_deg: Optional[float]
    swell2_height_m: Optional[float]   # secondary swell component
    swell2_period_s: Optional[float]
    swell2_direction_deg: Optional[float]
    swell3_height_m: Optional[float]   # tertiary swell component
    swell3_period_s: Optional[float]
    swell3_direction_deg: Optional[float]
    wind_wave_height_m: Optional[float]   # wind-generated sea component
    wind_wave_dir_deg: Optional[float]
    wind_wave_period_s: Optional[float]


_BASE_PARAMS = [
    "wave_height",
    "wave_period",
    "wave_direction",
    "swell_wave_height",
    "swell_wave_period",
    "swell_wave_direction",
    "wind_wave_height",
    "wind_wave_direction",
    "wind_wave_period",
]

_EXTRA_PARAMS = [
    "swell_wave_height_2",
    "swell_wave_period_2",
    "swell_wave_direction_2",
    "swell_wave_height_3",
    "swell_wave_period_3",
    "swell_wave_direction_3",
]


@dataclass
class WindHour:
    timestamp: datetime       # naive, America/Los_Angeles — matches marine timestamps
    speed_mph: float
    direction_deg: float      # meteorological: direction wind is coming FROM (0-360)


def _parse_hours(h: dict, has_extra: bool) -> list[MarineHour]:
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
            swell2_height_m=_get("swell_wave_height_2") if has_extra else None,
            swell2_period_s=_get("swell_wave_period_2") if has_extra else None,
            swell2_direction_deg=_get("swell_wave_direction_2") if has_extra else None,
            swell3_height_m=_get("swell_wave_height_3") if has_extra else None,
            swell3_period_s=_get("swell_wave_period_3") if has_extra else None,
            swell3_direction_deg=_get("swell_wave_direction_3") if has_extra else None,
            wind_wave_height_m=_get("wind_wave_height"),
            wind_wave_dir_deg=_get("wind_wave_direction"),
            wind_wave_period_s=_get("wind_wave_period"),
        ))
    return result


async def fetch_marine_forecast(lat: float, lon: float) -> list[MarineHour]:
    url = "https://marine-api.open-meteo.com/v1/marine"
    base = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "America/Los_Angeles",
        "forecast_days": 14,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try with secondary + tertiary swell first
        try:
            params = {**base, "hourly": ",".join(_BASE_PARAMS + _EXTRA_PARAMS)}
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return _parse_hours(resp.json().get("hourly", {}), has_extra=True)
        except Exception:
            pass

        # Fall back to primary-only if the extra params aren't supported
        try:
            params = {**base, "hourly": ",".join(_BASE_PARAMS)}
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return _parse_hours(resp.json().get("hourly", {}), has_extra=False)
        except Exception:
            return []


async def fetch_wind_forecast(lat: float, lon: float) -> list[WindHour]:
    """
    16-day hourly wind forecast from Open-Meteo weather API (global, free, no key).
    Used as fallback when NWS wind data runs out at ~7 days.
    Timestamps are in America/Los_Angeles to match marine forecast timestamps.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "wind_speed_10m,wind_direction_10m",
                    "wind_speed_unit": "mph",
                    "timezone": "America/Los_Angeles",
                    "forecast_days": 16,
                },
            )
            resp.raise_for_status()
            h = resp.json().get("hourly", {})
            times  = h.get("time", [])
            speeds = h.get("wind_speed_10m", [])
            dirs   = h.get("wind_direction_10m", [])
            result = []
            for i, t in enumerate(times):
                spd = speeds[i] if i < len(speeds) else None
                d   = dirs[i]   if i < len(dirs)   else None
                if spd is not None and d is not None:
                    result.append(WindHour(
                        timestamp=datetime.fromisoformat(t),
                        speed_mph=float(spd),
                        direction_deg=float(d),
                    ))
            return result
    except Exception:
        return []
