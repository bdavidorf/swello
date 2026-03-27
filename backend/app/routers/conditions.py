from __future__ import annotations
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import asyncio

from app.config import get_spots, get_spot_by_id
from app.models.surf import SurfCondition, SpotMeta, SpotRating, BreakingConditions, SunTimes, SwellComponent
from app.services.ndbc import fetch_buoy_with_fallback, deg_to_label
from app.services.nws import fetch_hourly_forecast
from app.services.wave_power import build_wave_power, wind_quality_for_spot
from app.services.wave_interpreter import interpret_breaking_conditions
from app.services.sun_times import get_sun_times
from app.services.coops import fetch_tide_predictions
from app.services.openmeteo import fetch_marine_forecast
from app.ml.crowd_model import predict_crowd

router = APIRouter(prefix="/conditions", tags=["conditions"])


def _build_swells(marine_hour) -> list[SwellComponent]:
    """Extract active swell components from the current Open-Meteo marine hour."""
    components = []
    M_TO_FT = 3.28084

    candidates = [
        ("Primary",   marine_hour.swell_height_m,    marine_hour.swell_period_s,    marine_hour.swell_direction_deg),
        ("Secondary", marine_hour.swell2_height_m,   marine_hour.swell2_period_s,   marine_hour.swell2_direction_deg),
        ("Tertiary",  marine_hour.swell3_height_m,   marine_hour.swell3_period_s,   marine_hour.swell3_direction_deg),
        ("Wind Chop", marine_hour.wind_wave_height_m, marine_hour.wind_wave_period_s, marine_hour.wind_wave_dir_deg),
    ]
    for label, h_m, period, dir_deg in candidates:
        if h_m is None or period is None or dir_deg is None:
            continue
        height_ft = h_m * M_TO_FT
        if height_ft < 0.3:  # skip tiny components
            continue
        components.append(SwellComponent(
            label=label,
            height_ft=round(height_ft, 1),
            period_s=round(period, 1),
            direction_deg=round(dir_deg, 0),
            direction_label=deg_to_label(dir_deg),
        ))
    return components


async def _build_condition(spot: dict) -> SurfCondition | None:
    tide_station = spot.get("tide_station")
    tasks = [
        fetch_buoy_with_fallback(spot["buoy_primary"], spot.get("buoy_fallback")),
        fetch_hourly_forecast(spot["lat"], spot["lon"]),
        fetch_tide_predictions(tide_station, days=2) if tide_station else asyncio.sleep(0),
        fetch_marine_forecast(spot["lat"], spot["lon"]),
    ]
    buoy, nws_raw, tide_data, marine_data = await asyncio.gather(*tasks, return_exceptions=True)
    if not tide_station:
        tide_data = None
    if buoy is None or isinstance(buoy, BaseException):
        return None
    nws_raw = nws_raw if not isinstance(nws_raw, BaseException) else []
    tide_data = tide_data if not isinstance(tide_data, BaseException) else None
    marine_data = marine_data if not isinstance(marine_data, BaseException) else []

    # Next upcoming tide event
    next_tide = None
    if tide_data and tide_data.events:
        future = [e for e in tide_data.events if e.hours_away is not None and e.hours_away > 0]
        if future:
            next_tide = future[0]

    # NWS wind (use spot lat/lon so each spot gets its own local wind)
    nws = nws_raw
    current_nws = nws[0] if nws else None

    wind = None
    if current_nws:
        wind = wind_quality_for_spot(
            current_nws.wind_dir,
            current_nws.wind_speed_mph,
            spot["offshore_wind_dir_min"],
            spot["offshore_wind_dir_max"],
        )

    wave_power = None
    breaking = None
    if buoy.wvht_m is not None and buoy.dpd_s is not None:
        wq  = wind.quality if wind else "cross"
        wsp = wind.speed_mph if wind else 10.0

        # Compute breaking conditions first so we can use face height for rating
        bc = interpret_breaking_conditions(
            wvht_m=buoy.wvht_m,
            dpd_s=buoy.dpd_s,
            mwd_deg=buoy.mwd_deg,
            spot=spot,
        )
        face_avg = (bc.face_height_min_ft + bc.face_height_max_ft) / 2
        wave_power = build_wave_power(
            buoy.wvht_m, buoy.dpd_s, wq,
            wind_speed_mph=wsp,
            face_height_ft=face_avg,
        )

        breaking = BreakingConditions(
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

    crowd = None
    if buoy.wvht_m is not None and buoy.dpd_s is not None:
        crowd = predict_crowd(
            spot_id=spot["id"],
            wvht_m=buoy.wvht_m,
            dpd_s=buoy.dpd_s,
            wind_speed_ms=buoy.wspd_ms or 3.0,
            wind_dir_deg=buoy.wdir_deg or 270.0,
        )
        crowd.peak_hour_today = None

    # Sun times (cheap calculation, no network call)
    sun_data = get_sun_times(spot["lat"], spot["lon"])
    sun_times = SunTimes(**{k: sun_data[k] for k in SunTimes.model_fields if k in sun_data}) if sun_data else None

    # Swell components from Open-Meteo (current hour)
    swells: list[SwellComponent] = []
    if marine_data:
        now = datetime.now()
        current_hour = min(marine_data, key=lambda h: abs((h.timestamp - now).total_seconds()))
        swells = _build_swells(current_hour)

    # Fallback: build swell list from buoy if Open-Meteo returned nothing
    if not swells and buoy.wvht_ft and buoy.dpd_s and buoy.mwd_deg is not None:
        swells = [SwellComponent(
            label="Primary",
            height_ft=round(buoy.wvht_ft, 1),
            period_s=round(buoy.dpd_s, 1),
            direction_deg=round(buoy.mwd_deg, 0),
            direction_label=buoy.mwd_label or deg_to_label(buoy.mwd_deg),
        )]

    return SurfCondition(
        spot_id=spot["id"],
        spot_name=spot["name"],
        spot_short_name=spot["short_name"],
        updated_at=datetime.now(tz=timezone.utc),
        buoy=buoy,
        wave_power=wave_power,
        breaking=breaking,
        wind=wind,
        crowd=crowd,
        sun=sun_times,
        next_tide=next_tide,
        swells=swells,
    )


@router.get("", response_model=list[SurfCondition])
async def all_conditions():
    """Current conditions for all spots. Expensive — use /meta/all for lightweight listing."""
    spots = get_spots()
    tasks = [_build_condition(s) for s in spots]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, SurfCondition)]


@router.get("/{spot_id}", response_model=SurfCondition)
async def spot_conditions(spot_id: str):
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")
    result = await _build_condition(spot)
    if not result:
        raise HTTPException(503, "Failed to fetch buoy data")
    return result


@router.get("/meta/all", response_model=list[SpotMeta])
async def spot_metadata():
    spots = get_spots()
    return [SpotMeta(**{k: s[k] for k in SpotMeta.model_fields if k in s}) for s in spots]


async def _build_rating(spot: dict) -> SpotRating:
    """Lightweight rating: only buoy data (no NWS/tide/marine). Uses buoy cache."""
    buoy = await fetch_buoy_with_fallback(spot["buoy_primary"], spot.get("buoy_fallback"))
    if buoy is None or buoy.wvht_m is None or buoy.dpd_s is None:
        return SpotRating(spot_id=spot["id"])

    bc = interpret_breaking_conditions(
        wvht_m=buoy.wvht_m,
        dpd_s=buoy.dpd_s,
        mwd_deg=buoy.mwd_deg,
        spot=spot,
    )
    face_avg = (bc.face_height_min_ft + bc.face_height_max_ft) / 2
    wp = build_wave_power(buoy.wvht_m, buoy.dpd_s, "cross", 10.0, face_avg)

    lo, hi = bc.face_height_min_ft, bc.face_height_max_ft
    fmt = lambda n: f"{n:.1f}" if n < 4 else f"{n:.0f}"
    wave_height_str = f"{fmt(lo)}–{fmt(hi)}ft" if round(lo, 1) != round(hi, 1) else f"{fmt(lo)}ft"

    return SpotRating(spot_id=spot["id"], rating=wp.surf_rating, wave_height_str=wave_height_str)


@router.get("/ratings", response_model=list[SpotRating])
async def spot_ratings():
    """Lightweight ratings for all spots. Fetches only buoy data (uses cache after first call)."""
    spots = get_spots()
    results = await asyncio.gather(*[_build_rating(s) for s in spots], return_exceptions=True)
    return [r for r in results if isinstance(r, SpotRating)]
