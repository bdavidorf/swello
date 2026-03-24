from __future__ import annotations
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import asyncio

from app.config import get_spots, get_spot_by_id
from app.models.surf import SurfCondition, SpotMeta, BreakingConditions, SunTimes
from app.services.ndbc import fetch_buoy_with_fallback
from app.services.nws import fetch_hourly_forecast
from app.services.wave_power import build_wave_power, wind_quality_for_spot
from app.services.wave_interpreter import interpret_breaking_conditions
from app.services.sun_times import get_sun_times
from app.ml.crowd_model import predict_crowd

router = APIRouter(prefix="/conditions", tags=["conditions"])


async def _build_condition(spot: dict) -> SurfCondition | None:
    buoy = await fetch_buoy_with_fallback(spot["buoy_primary"], spot["buoy_fallback"])
    if not buoy:
        return None

    # NWS wind (use spot lat/lon so each spot gets its own local wind)
    nws = await fetch_hourly_forecast(spot["lat"], spot["lon"])
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
    if buoy.wvht_m and buoy.dpd_s:
        wq = wind.quality if wind else "cross"
        wave_power = build_wave_power(buoy.wvht_m, buoy.dpd_s, wq)

        # Spot-specific breaking wave interpretation
        bc = interpret_breaking_conditions(
            wvht_m=buoy.wvht_m,
            dpd_s=buoy.dpd_s,
            mwd_deg=buoy.mwd_deg,
            spot=spot,
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
    if buoy.wvht_m and buoy.dpd_s:
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
    )


@router.get("", response_model=list[SurfCondition])
async def all_conditions():
    """Current conditions for all LA spots."""
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
