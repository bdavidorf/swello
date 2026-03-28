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
from app.services.openmeteo import fetch_marine_forecast, fetch_current_wind
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
        fetch_current_wind(spot["lat"], spot["lon"]),
    ]
    buoy, nws_raw, tide_data, marine_data, om_wind = await asyncio.gather(*tasks, return_exceptions=True)
    if not tide_station:
        tide_data = None
    if buoy is None or isinstance(buoy, BaseException):
        return None
    # Clear wave fields for stale buoy readings (> 3 hours old) so the conditions
    # card doesn't display a month-old wave height as current.
    if buoy.data_age_minutes is not None and buoy.data_age_minutes > 180:
        buoy = buoy.model_copy(update={
            'wvht_m': None, 'wvht_ft': None,
            'dpd_s': None, 'mwd_deg': None, 'mwd_label': None,
        })
    nws_raw    = nws_raw    if not isinstance(nws_raw,    BaseException) else []
    tide_data  = tide_data  if not isinstance(tide_data,  BaseException) else None
    marine_result = marine_data if not isinstance(marine_data, BaseException) else None
    marine_data = marine_result.hours if marine_result else []
    _marine_utc_offset = marine_result.utc_offset_seconds if marine_result else -28800  # fallback: PT
    om_wind    = om_wind    if not isinstance(om_wind,    BaseException) else (None, None, None)

    # Next upcoming tide event
    next_tide = None
    if tide_data and tide_data.events:
        future = [e for e in tide_data.events if e.hours_away is not None and e.hours_away > 0]
        if future:
            next_tide = future[0]

    # Current tide height — closest hourly prediction to now
    current_tide_ft = None
    if tide_data and tide_data.predictions:
        now_utc = datetime.now(timezone.utc)
        closest = min(tide_data.predictions, key=lambda p: abs((p.timestamp - now_utc).total_seconds()))
        if abs((closest.timestamp - now_utc).total_seconds()) < 7200:  # within 2h
            current_tide_ft = round(closest.height_ft, 1)

    # Air temp from Open-Meteo (3rd value in tuple)
    air_temp_f = None
    if isinstance(om_wind, tuple) and len(om_wind) >= 3:
        air_temp_f = om_wind[2]

    # Wind: prefer NWS (accurate gridded model), fall back to Open-Meteo (global coverage)
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
    else:
        # NWS failed or returned nothing — use Open-Meteo wind (always available, global)
        om_spd, om_deg, _air = om_wind if isinstance(om_wind, tuple) else (None, None, None)
        if om_spd is not None and om_deg is not None:
            wind = wind_quality_for_spot(
                deg_to_label(om_deg),
                om_spd,
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

    # Sun times (cheap calculation, no network call)
    sun_data = get_sun_times(spot["lat"], spot["lon"])

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

        # No surfers in the dark — zero out crowd between dusk and dawn
        if sun_data:
            from datetime import datetime as _dt
            from zoneinfo import ZoneInfo as _ZI
            _tz = _ZI("America/Los_Angeles")
            _now = _dt.now(_tz)
            _dawn = _dt.fromisoformat(sun_data["first_light"])
            _dusk = _dt.fromisoformat(sun_data["last_light"])
            if not (_dawn <= _now <= _dusk):
                from app.models.crowd import CrowdPrediction, score_to_level
                crowd = CrowdPrediction(score=0.0, level="empty", confidence=1.0)
    sun_times = SunTimes(**{k: sun_data[k] for k in SunTimes.model_fields if k in sun_data}) if sun_data else None

    # Swell components from Open-Meteo (current hour).
    # Marine timestamps are naive local time (timezone=auto). Compute "now" in the
    # same naive local time using the UTC offset returned by the API.
    swells: list[SwellComponent] = []
    if marine_data:
        from datetime import timedelta as _td
        _now_local = datetime.now(timezone.utc).replace(tzinfo=None) + _td(seconds=_marine_utc_offset)
        current_hour = min(marine_data, key=lambda h: abs((h.timestamp - _now_local).total_seconds()))
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
        current_tide_ft=current_tide_ft,
        air_temp_f=air_temp_f,
        swells=swells,
    )


@router.get("", response_model=list[SurfCondition])
async def all_conditions():
    """Current conditions for all spots. Expensive — use /meta/all for lightweight listing."""
    spots = get_spots()
    tasks = [_build_condition(s) for s in spots]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, SurfCondition)]


@router.get("/meta/all", response_model=list[SpotMeta])
async def spot_metadata():
    spots = get_spots()
    return [SpotMeta(**{k: s[k] for k in SpotMeta.model_fields if k in s}) for s in spots]


async def _build_rating(spot: dict) -> SpotRating:
    """Lightweight rating: buoy + Open-Meteo wind (concurrent). Uses buoy cache."""
    buoy, om_wind = await asyncio.gather(
        fetch_buoy_with_fallback(spot["buoy_primary"], spot.get("buoy_fallback")),
        fetch_current_wind(spot["lat"], spot["lon"]),
        return_exceptions=True,
    )
    if buoy is None or isinstance(buoy, BaseException):
        return SpotRating(spot_id=spot["id"])  # buoy completely unreachable → dot

    # Buoy connected but no wave data → flat/calm conditions
    if buoy.wvht_m is None or buoy.dpd_s is None:
        return SpotRating(spot_id=spot["id"], rating=0, wave_height_str="flat")

    om_wind = om_wind if isinstance(om_wind, tuple) else (None, None, None)
    om_spd, om_deg, _air = om_wind

    bc = interpret_breaking_conditions(
        wvht_m=buoy.wvht_m,
        dpd_s=buoy.dpd_s,
        mwd_deg=buoy.mwd_deg,
        spot=spot,
    )
    face_avg = (bc.face_height_min_ft + bc.face_height_max_ft) / 2

    wind_quality = "cross"
    wind_speed = 10.0
    if om_spd is not None and om_deg is not None:
        wq = wind_quality_for_spot(
            deg_to_label(om_deg), om_spd,
            spot["offshore_wind_dir_min"], spot["offshore_wind_dir_max"],
        )
        wind_quality = wq.quality
        wind_speed = om_spd

    wp = build_wave_power(buoy.wvht_m, buoy.dpd_s, wind_quality, wind_speed, face_avg)

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


@router.get("/{spot_id}", response_model=SurfCondition)
async def spot_conditions(spot_id: str):
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")
    result = await _build_condition(spot)
    if not result:
        raise HTTPException(503, "Failed to fetch buoy data")
    return result
