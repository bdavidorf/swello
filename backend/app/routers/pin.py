from __future__ import annotations
"""
On-demand surf conditions for any lat/lon worldwide.
Uses Open-Meteo Marine (global, no API key) + Open-Meteo Weather for wind.
"""

import httpx
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query

from app.services.openmeteo import fetch_marine_forecast
from app.services.wave_power import build_wave_power, wind_quality_for_spot
from app.services.wave_interpreter import interpret_breaking_conditions
from app.services.sun_times import get_sun_times
from app.services.ndbc import deg_to_label
from app.models.surf import (
    SurfCondition, BuoyReading, BreakingConditions,
    SunTimes, SwellComponent,
)

router = APIRouter(prefix="/conditions/pin", tags=["pin"])

M_TO_FT = 3.28084


async def _fetch_wind_global(lat: float, lon: float) -> tuple[Optional[float], Optional[float]]:
    """Current wind speed (mph) + direction (deg) from Open-Meteo weather (global)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "wind_speed_10m,wind_direction_10m",
                    "wind_speed_unit": "mph",
                    "forecast_days": 1,
                },
            )
            resp.raise_for_status()
            cur = resp.json().get("current", {})
            return cur.get("wind_speed_10m"), cur.get("wind_direction_10m")
    except Exception:
        return None, None


@router.get("", response_model=SurfCondition)
async def pin_conditions(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str = Query(default="Dropped Pin"),
):
    """Return surf conditions for any lat/lon in the world."""
    marine_data, (wind_mph, wind_deg_raw) = await asyncio.gather(
        fetch_marine_forecast(lat, lon),
        _fetch_wind_global(lat, lon),
    )

    # ── Current marine hour ───────────────────────────────────────────────────
    now = datetime.now()
    current_hour = None
    if marine_data:
        current_hour = min(marine_data, key=lambda h: abs((h.timestamp - now).total_seconds()))

    # ── Land/ocean detection ──────────────────────────────────────────────────
    # Open-Meteo only populates wave_height_m for actual ocean grid cells.
    # Coastal land pins can still snap to a nearby ocean grid cell and return
    # swell component values — use wave_height_m as the definitive gate.
    is_ocean = current_hour is not None and current_hour.wave_height_m is not None

    # ── Wave data: prefer primary swell component for surf assessment ─────────
    wvht_m  = (current_hour.swell_height_m  or current_hour.wave_height_m)  if is_ocean else None
    dpd_s   = (current_hour.swell_period_s  or current_hour.wave_period_s)  if is_ocean else None
    mwd_deg = (current_hour.swell_direction_deg or current_hour.wave_direction_deg) if is_ocean else None

    # ── Virtual spot: infer coastline from dominant swell direction ───────────
    # The coast faces the direction swell arrives FROM; land is behind it.
    # Offshore wind blows from land → ocean, so from the opposite direction.
    swell_dir       = mwd_deg or 270.0
    offshore_center = (swell_dir + 180) % 360  # direction of land behind beach

    virtual_spot = {
        "id": "pin",
        "name": name,
        "short_name": name[:14],
        "lat": lat,
        "lon": lon,
        "ideal_swell_dir": swell_dir,
        "ideal_swell_dir_label": deg_to_label(swell_dir),
        "swell_window_min": (swell_dir - 60) % 360,
        "swell_window_max": (swell_dir + 60) % 360,
        "offshore_wind_dir_min": (offshore_center - 45) % 360,
        "offshore_wind_dir_max": (offshore_center + 45) % 360,
        "offshore_wind_label": deg_to_label(offshore_center),
        "exposure_factor": 0.85,       # conservative default for unknown spot
        "bathymetry_focus": 1.0,
        "swell_notes": f"Dropped pin at {lat:.3f}°, {lon:.3f}°",
    }

    # ── Buoy-like reading (synthesised from Open-Meteo data) ──────────────────
    buoy = BuoyReading(
        station_id="open-meteo",
        timestamp=datetime.now(tz=timezone.utc),
        wvht_m=wvht_m,
        wvht_ft=round(wvht_m * M_TO_FT, 1) if wvht_m else None,
        dpd_s=dpd_s,
        mwd_deg=mwd_deg,
        mwd_label=deg_to_label(mwd_deg) if mwd_deg is not None else None,
        wspd_mph=wind_mph,
        wdir_deg=wind_deg_raw,
        wdir_label=deg_to_label(wind_deg_raw) if wind_deg_raw is not None else None,
        data_age_minutes=0,
    )

    # ── Wind quality ──────────────────────────────────────────────────────────
    wind = None
    if wind_mph is not None and wind_deg_raw is not None:
        wind = wind_quality_for_spot(
            wind_dir_label=deg_to_label(wind_deg_raw),
            wind_speed_mph=wind_mph,
            spot_offshore_dir_min=int(virtual_spot["offshore_wind_dir_min"]),
            spot_offshore_dir_max=int(virtual_spot["offshore_wind_dir_max"]),
        )

    # ── Wave power + breaking conditions ─────────────────────────────────────
    wave_power = None
    breaking   = None
    if wvht_m is not None and dpd_s is not None:
        wq  = wind.quality    if wind else "cross"
        wsp = wind.speed_mph  if wind else 10.0

        bc = interpret_breaking_conditions(
            wvht_m=wvht_m,
            dpd_s=dpd_s,
            mwd_deg=mwd_deg,
            spot=virtual_spot,
        )
        face_avg   = (bc.face_height_min_ft + bc.face_height_max_ft) / 2
        wave_power = build_wave_power(wvht_m, dpd_s, wq, wind_speed_mph=wsp, face_height_ft=face_avg)
        breaking   = BreakingConditions(
            buoy_hs_ft=bc.buoy_hs_ft,
            buoy_period_s=bc.buoy_period_s,
            buoy_dir_deg=bc.buoy_dir_deg,
            swell_type=bc.swell_type,
            swell_type_short=bc.swell_type_short,
            period_quality=bc.period_quality,
            swell_angle_diff=bc.swell_angle_diff,
            direction_rating=bc.direction_rating,
            direction_pct=bc.direction_pct,
            breaking_hs_ft=bc.breaking_hs_ft,
            face_height_min_ft=bc.face_height_min_ft,
            face_height_max_ft=bc.face_height_max_ft,
            face_height_label=bc.face_height_label,
            interpretation=bc.interpretation,
            spot_context=bc.spot_context,
        )

    # ── Sun times ─────────────────────────────────────────────────────────────
    sun_data  = get_sun_times(lat, lon)
    sun_times = SunTimes(**{k: sun_data[k] for k in SunTimes.model_fields if k in sun_data}) if sun_data else None

    # ── Swell components ──────────────────────────────────────────────────────
    swells: list[SwellComponent] = []
    if is_ocean:
        candidates = [
            ("Primary",   current_hour.swell_height_m,     current_hour.swell_period_s,     current_hour.swell_direction_deg),
            ("Secondary", current_hour.swell2_height_m,    current_hour.swell2_period_s,    current_hour.swell2_direction_deg),
            ("Tertiary",  current_hour.swell3_height_m,    current_hour.swell3_period_s,    current_hour.swell3_direction_deg),
            ("Wind Chop", current_hour.wind_wave_height_m, current_hour.wind_wave_period_s, current_hour.wind_wave_dir_deg),
        ]
        for label, h_m, period, dir_deg in candidates:
            if h_m is None or period is None or dir_deg is None:
                continue
            height_ft = h_m * M_TO_FT
            if height_ft < 0.3:
                continue
            swells.append(SwellComponent(
                label=label,
                height_ft=round(height_ft, 1),
                period_s=round(period, 1),
                direction_deg=round(dir_deg, 0),
                direction_label=deg_to_label(dir_deg),
            ))

    return SurfCondition(
        spot_id="pin",
        spot_name=name,
        spot_short_name=name[:14],
        updated_at=datetime.now(tz=timezone.utc),
        buoy=buoy,
        wave_power=wave_power,
        breaking=breaking,
        wind=wind,
        crowd=None,
        sun=sun_times,
        next_tide=None,
        swells=swells,
    )
