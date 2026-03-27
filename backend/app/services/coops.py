from __future__ import annotations
"""
NOAA CO-OPS Tides & Currents API.
Fetches hourly tide predictions and high/low events.
"""

import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.models.tide import TidePrediction, TideEvent, TideWindow
from app.config import get_settings

settings = get_settings()


async def fetch_tide_predictions(
    station_id: str,
    days: int = 7,
) -> Optional[TideWindow]:
    now = datetime.now(tz=timezone.utc)
    begin = now.strftime("%Y%m%d")
    end = (now + timedelta(days=days)).strftime("%Y%m%d")

    base = settings.coops_base_url

    # Fetch hourly predictions
    hourly_params = {
        "begin_date": begin,
        "end_date": end,
        "station": station_id,
        "product": "predictions",
        "datum": "MLLW",
        "time_zone": "gmt",   # UTC — consistent across all US stations incl. Hawaii/PR
        "interval": "h",
        "units": "english",
        "application": "surf_forecast_app",
        "format": "json",
    }

    # Fetch high/low events
    hl_params = {**hourly_params, "interval": "hilo"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            hourly_resp, hl_resp = await asyncio.gather(
                client.get(base, params=hourly_params),
                client.get(base, params=hl_params),
            )
        except Exception:
            return None

    hourly_data = hourly_resp.json().get("predictions", [])
    hl_data = hl_resp.json().get("predictions", [])

    predictions = []
    for item in hourly_data:
        try:
            ts = datetime.strptime(item["t"], "%Y-%m-%d %H:%M")
            predictions.append(TidePrediction(timestamp=ts, height_ft=float(item["v"])))
        except Exception:
            continue

    events = []
    for item in hl_data:
        try:
            ts = datetime.strptime(item["t"], "%Y-%m-%d %H:%M")
            etype = "high" if item["type"] == "H" else "low"
            hrs_away = (ts - datetime.utcnow()).total_seconds() / 3600
            events.append(TideEvent(
                event_type=etype,
                timestamp=ts,
                height_ft=float(item["v"]),
                hours_away=round(hrs_away, 1),
            ))
        except Exception:
            continue

    return TideWindow(
        station_id=station_id,
        generated_at=datetime.now(tz=timezone.utc),
        predictions=predictions,
        events=events,
    )


import asyncio
