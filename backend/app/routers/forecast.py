from __future__ import annotations
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, date, timedelta
from collections import defaultdict
from zoneinfo import ZoneInfo
import asyncio
import math

from app.config import get_spot_by_id
from app.services.nws import fetch_hourly_forecast
from app.services.openmeteo import fetch_marine_forecast, fetch_wind_forecast, MarineHour
from app.services.wave_power import wind_quality_for_spot, CARDINAL_TO_DEG
from app.services.wave_interpreter import interpret_breaking_conditions
from app.services.coops import fetch_tide_predictions
from app.services.ndbc import fetch_buoy_with_fallback, deg_to_label
from app.ml.crowd_model import predict_crowd

_LA_TZ = ZoneInfo("America/Los_Angeles")

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _nws_wind_to_deg(direction: str) -> float:
    return CARDINAL_TO_DEG.get(direction.upper(), 270.0)


def _best_wind_quality(qualities: list) -> str:
    order = ["offshore", "cross-offshore", "cross", "cross-onshore", "onshore"]
    for q in order:
        if q in qualities:
            return q
    return "cross"


def _detect_combo_swell(mh: MarineHour, spot: dict) -> tuple[bool, str]:
    """
    Detects when two significant independent swell trains are both reaching a spot.

    Physics: Open-Meteo provides total wave height (RMS of all components) and the
    primary swell separately. The secondary component height is:
        H_secondary = sqrt(H_total² - H_primary²)

    If H_secondary is meaningful AND its direction falls in the spot's secondary
    swell window, a constructive combo is occurring.

    Returns (combo_detected: bool, label: str)
    """
    sec_min = spot.get("secondary_swell_min")
    sec_max = spot.get("secondary_swell_max")
    if sec_min is None or sec_max is None:
        return False, ""

    total_h = mh.wave_height_m
    swell_h = mh.swell_height_m
    if not total_h or not swell_h or total_h <= 0:
        return False, ""

    # Derived secondary component height
    secondary_sq = total_h ** 2 - swell_h ** 2
    if secondary_sq <= 0:
        return False, ""
    secondary_h = math.sqrt(secondary_sq)

    # Secondary must be at least 35% of total energy (by height) to matter
    if secondary_h / total_h < 0.35:
        return False, ""

    # Check if the secondary energy direction aligns with this spot's secondary window.
    # Use wind wave direction as proxy — if wind is light (<10kts), elevated wind_wave_height
    # more likely reflects a distant secondary swell than locally generated chop.
    secondary_dir = mh.wind_wave_dir_deg
    if secondary_dir is None:
        # Can't confirm direction — still flag combo if energy is substantial
        if secondary_h / total_h >= 0.45:
            return True, spot.get("combo_label", "combo swell")
        return False, ""

    def _in_window(d: float, lo: float, hi: float) -> bool:
        if lo <= hi:
            return lo <= d <= hi
        return d >= lo or d <= hi  # wraps through 0/360

    if _in_window(secondary_dir, sec_min, sec_max):
        return True, spot.get("combo_label", "combo swell")

    return False, ""


def _tide_score(tide_ft: float | None, spot: dict) -> float:
    """
    Returns 0.0-0.5 based on how close current tide is to the spot's optimal range.
    0.5 = within optimal window
    0.25 = within 1ft of optimal window
    0.0 = outside
    """
    if tide_ft is None:
        return 0.25  # unknown — give neutral score
    t_min = spot.get("tide_optimal_min_ft", 1.0)
    t_max = spot.get("tide_optimal_max_ft", 4.0)
    if t_min <= tide_ft <= t_max:
        return 0.5
    # Within 1ft of optimal window
    if abs(tide_ft - t_min) <= 1.0 or abs(tide_ft - t_max) <= 1.0:
        return 0.25
    return 0.0


def _compute_surf_rating(
    face_max_ft: float,
    period_quality: str,
    wind_quality: str,
    direction_rating: str,
    tide_ft: float | None,
    spot: dict,
    crowd_score: float,
    combo_swell: bool = False,
) -> int:
    """
    Holistic surf session rating 0-10.

    Scoring breakdown (max before clamping = ~12, clamped to 10):
      Height      0–4.0    (primary driver of wave energy)
      Period      0–2.5    (groundswell vs wind swell)
      Wind       -2.0–+2.0 (offshore/onshore)
      Direction   0–1.0    (swell angle vs spot's optimal)
      Tide        0–0.5    (actual vs spot's optimal tide range)
      Combo       0–1.0    (constructive multi-swell event)
      Crowd      -1.0–0.0  (crowded sessions = harder to catch waves)
    """
    # Height (0-4)
    if face_max_ft >= 8:   h = 4.0
    elif face_max_ft >= 5: h = 3.5
    elif face_max_ft >= 3: h = 3.0
    elif face_max_ft >= 2: h = 2.0
    elif face_max_ft >= 1: h = 1.0
    else:                  h = 0.0

    # Period quality (0-2.5)
    p = {"excellent": 2.5, "good": 1.75, "fair": 1.0, "poor": 0.0}.get(period_quality, 1.0)

    # Wind (-2 to +2)
    w = {"offshore": 2.0, "cross-offshore": 1.0, "cross": 0.0,
         "cross-onshore": -1.0, "onshore": -2.0}.get(wind_quality, 0.0)

    # Swell direction (0-1)
    d = {"ideal": 1.0, "good": 0.75, "cross": 0.25,
         "marginal": 0.0, "blocked": -0.5}.get(direction_rating, 0.25)

    # Tide (0-0.5)
    t = _tide_score(tide_ft, spot)

    # Combo swell bonus (0-1)
    c = 1.0 if combo_swell else 0.0

    # Crowd penalty (-1 to 0)
    #   Crowded lineups mean fewer waves per surfer, more interference.
    if crowd_score >= 75:   crowd = -1.0
    elif crowd_score >= 55: crowd = -0.5
    elif crowd_score >= 35: crowd = -0.25
    else:                   crowd = 0.0

    total = h + p + w + d + t + c + crowd
    return max(0, min(10, round(total)))


@router.get("/{spot_id}")
async def spot_forecast(spot_id: str):
    """7-day swell forecast using Open-Meteo marine model + NWS wind + NOAA tides."""
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")

    tide_station = spot.get("tide_station")
    marine, nws, tide_window, om_wind, buoy = await asyncio.gather(
        fetch_marine_forecast(spot["lat"], spot["lon"]),
        fetch_hourly_forecast(spot["lat"], spot["lon"]),
        fetch_tide_predictions(tide_station, days=15) if tide_station else asyncio.sleep(0),
        fetch_wind_forecast(spot["lat"], spot["lon"]),
        fetch_buoy_with_fallback(spot["buoy_primary"], spot.get("buoy_fallback")),
        return_exceptions=True,
    )
    if not tide_station:
        tide_window = None

    if isinstance(marine, Exception) or not marine or not marine.hours:
        raise HTTPException(503, "Marine forecast unavailable")

    marine_hours = marine.hours
    utc_offset_seconds = marine.utc_offset_seconds

    # Spot's local timezone offset (fixed, from Open-Meteo response).
    # Marine and Open-Meteo wind timestamps are naive datetimes in this local time.
    _spot_tz = timezone(timedelta(seconds=utc_offset_seconds))

    # Current time in the spot's local timezone (matches marine timestamp format)
    now_local = datetime.now(_spot_tz).replace(tzinfo=None)

    # NWS wind lookup: NWS timestamps are timezone-aware in the forecast-point's
    # local timezone. Convert to the same naive local time as the marine timestamps.
    wind_by_hour: dict = {}
    if isinstance(nws, list):
        for pt in nws:
            ts_local = pt.timestamp.astimezone(_spot_tz).replace(tzinfo=None)
            wind_by_hour[(ts_local.date(), ts_local.hour)] = pt

    # Open-Meteo wind: also uses timezone=auto → timestamps are naive local time,
    # matching marine timestamps directly.
    om_wind_by_hour: dict = {}
    if isinstance(om_wind, list):
        for wh in om_wind:
            om_wind_by_hour[(wh.timestamp.date(), wh.timestamp.hour)] = wh

    # Tide lookup: (date, hour) -> tide_ft (MLLW).
    # CO-OPS returns UTC timestamps; convert to spot's local time for hour matching.
    tide_by_hour: dict = {}
    if not isinstance(tide_window, Exception) and tide_window:
        for tp in (tide_window.predictions or []):
            ts_local = tp.timestamp.astimezone(_spot_tz)
            tide_by_hour[(ts_local.date(), ts_local.hour)] = tp.height_ft

    # Valid buoy reading to anchor forecast near present.
    # Reject stale readings (> 3 hours old) — a month-old buoy must not anchor live data.
    live_buoy = buoy if (buoy and not isinstance(buoy, BaseException) and
                         buoy.wvht_m is not None and buoy.dpd_s is not None and
                         buoy.data_age_minutes is not None and buoy.data_age_minutes < 180) else None

    # ── Hourly interpreted forecast ──────────────────────────────────────────
    hourly = []
    for mh in marine_hours:
        ts = mh.timestamp
        hours_from_now = (ts - now_local).total_seconds() / 3600

        # Anchor current window (±3h) to actual buoy reading so the forecast
        # matches the live conditions card instead of the (often lower) model data.
        if live_buoy and -3 <= hours_from_now <= 3:
            wvht_m  = live_buoy.wvht_m
            dpd_s   = live_buoy.dpd_s
            mwd_deg = live_buoy.mwd_deg if live_buoy.mwd_deg is not None else (mh.swell_direction_deg or mh.wave_direction_deg)
        else:
            wvht_m  = mh.swell_height_m  or mh.wave_height_m
            dpd_s   = mh.swell_period_s   or mh.wave_period_s
            mwd_deg = mh.swell_direction_deg or mh.wave_direction_deg

        breaking = None
        face_min = face_max = 0.0
        period_quality = "fair"
        swell_type_short = "Mixed swell"
        direction_rating = "cross"

        if wvht_m and dpd_s:
            try:
                # Primary swell (or buoy-anchored reading)
                bc1 = interpret_breaking_conditions(wvht_m, dpd_s, mwd_deg, spot)
                bcs = [bc1]

                # Only process secondary/tertiary when NOT in buoy-anchor window
                # (buoy Hs already captures all components via spectral RMS)
                if not (live_buoy and -3 <= hours_from_now <= 3):
                    for sh, sp, sd in [
                        (mh.swell2_height_m, mh.swell2_period_s, mh.swell2_direction_deg),
                        (mh.swell3_height_m, mh.swell3_period_s, mh.swell3_direction_deg),
                    ]:
                        if sh and sp and sh >= 0.2:  # skip trivial components
                            try:
                                bc_extra = interpret_breaking_conditions(
                                    sh, sp, sd or mwd_deg, spot
                                )
                                # Only include if the component meaningfully reaches this spot
                                if bc_extra.breaking_hs_ft >= 0.3:
                                    bcs.append(bc_extra)
                            except Exception:
                                pass

                # Combine face heights via RMS (energy addition), use primary for labels
                combined_face_min = math.sqrt(sum(bc.face_height_min_ft ** 2 for bc in bcs))
                combined_face_max = math.sqrt(sum(bc.face_height_max_ft ** 2 for bc in bcs))

                breaking = bc1  # primary drives labels/interpretation
                face_min = round(combined_face_min, 1)
                face_max = round(combined_face_max, 1)
                period_quality = bc1.period_quality
                swell_type_short = bc1.swell_type_short
                direction_rating = bc1.direction_rating
            except Exception:
                pass

        nws_pt  = wind_by_hour.get((ts.date(), ts.hour))
        om_wh   = om_wind_by_hour.get((ts.date(), ts.hour))
        wind_speed_mph = 0.0
        wind_quality = "cross"
        wind_quality_label = "Cross"
        if nws_pt:
            # NWS: accurate model-based forecast (~7 days out)
            try:
                wind = wind_quality_for_spot(
                    nws_pt.wind_dir, nws_pt.wind_speed_mph,
                    spot["offshore_wind_dir_min"], spot["offshore_wind_dir_max"],
                )
                wind_speed_mph = nws_pt.wind_speed_mph
                wind_quality = wind.quality
                wind_quality_label = wind.quality_label
            except Exception:
                pass
        elif om_wh:
            # Open-Meteo fallback: covers days 7-16 where NWS has no data
            try:
                wind = wind_quality_for_spot(
                    deg_to_label(om_wh.direction_deg), om_wh.speed_mph,
                    spot["offshore_wind_dir_min"], spot["offshore_wind_dir_max"],
                )
                wind_speed_mph = om_wh.speed_mph
                wind_quality = wind.quality
                wind_quality_label = wind.quality_label
            except Exception:
                pass

        tide_ft = tide_by_hour.get((ts.date(), ts.hour))

        combo_swell, combo_label = _detect_combo_swell(mh, spot)

        crowd_score = 50.0
        crowd_level = "moderate"
        try:
            wind_dir_for_crowd = (
                _nws_wind_to_deg(nws_pt.wind_dir) if nws_pt
                else om_wh.direction_deg if om_wh
                else 270.0
            )
            crowd = predict_crowd(
                spot_id=spot["id"], wvht_m=wvht_m or 0.5, dpd_s=dpd_s or 9.0,
                wind_speed_ms=wind_speed_mph * 0.44704,
                wind_dir_deg=wind_dir_for_crowd,
                dt=ts,
            )
            crowd.peak_hour_today = None
            crowd_score, crowd_level = crowd.score, crowd.level
        except Exception:
            pass

        surf_rating = _compute_surf_rating(
            face_max_ft=face_max,
            period_quality=period_quality,
            wind_quality=wind_quality,
            direction_rating=direction_rating,
            tide_ft=tide_ft,
            spot=spot,
            crowd_score=crowd_score,
            combo_swell=combo_swell,
        )

        hourly.append({
            "timestamp": ts.isoformat(),
            "date": ts.date().isoformat(),
            "hour": ts.hour,
            "face_height_min_ft": round(face_min, 1),
            "face_height_max_ft": round(face_max, 1),
            "face_height_label": breaking.face_height_label if breaking else "flat",
            "swell_height_m": round(wvht_m, 2) if wvht_m else None,
            "swell_period_s": round(dpd_s, 1) if dpd_s else None,
            "swell_dir_deg": round(mwd_deg, 0) if mwd_deg else None,
            "swell_type_short": swell_type_short,
            "period_quality": period_quality,
            "direction_rating": direction_rating,
            "direction_pct": breaking.direction_pct if breaking else 0.5,
            "wind_speed_mph": round(wind_speed_mph, 1),
            "wind_quality": wind_quality,
            "wind_quality_label": wind_quality_label,
            "tide_ft": round(tide_ft, 1) if tide_ft is not None else None,
            "combo_swell": combo_swell,
            "combo_label": combo_label,
            "surf_rating": surf_rating,
            "crowd_score": crowd_score,
            "crowd_level": crowd_level,
        })

    # ── Daily summaries ──────────────────────────────────────────────────────
    by_day = defaultdict(list)
    for h in hourly:
        by_day[h["date"]].append(h)

    today_str = now_local.date().isoformat()
    daily = []

    current_hour = now_local.hour

    for day_str in sorted(by_day.keys()):
        all_h = by_day[day_str]
        if day_str == today_str:
            # For today, extend the surf window to the current hour so live
            # buoy-anchored readings (which may be after 6pm) are considered.
            upper = max(18, current_hour)
            surf_h = [h for h in all_h if 6 <= h["hour"] <= upper] or all_h
        else:
            surf_h = [h for h in all_h if 6 <= h["hour"] <= 18] or all_h
        peak   = max(surf_h, key=lambda h: h["face_height_max_ft"])

        periods    = [h["swell_period_s"] for h in surf_h if h["swell_period_s"]]
        avg_period = sum(periods) / len(periods) if periods else None
        avg_wind   = sum(h["wind_speed_mph"] for h in surf_h) / len(surf_h)
        avg_crowd  = sum(h["crowd_score"] for h in surf_h) / len(surf_h)
        best_rating = max(h["surf_rating"] for h in surf_h)
        has_combo   = any(h["combo_swell"] for h in surf_h)
        combo_label = next((h["combo_label"] for h in surf_h if h["combo_swell"]), "")

        crowd_level = (
            "empty"     if avg_crowd < 15 else
            "uncrowded" if avg_crowd < 35 else
            "moderate"  if avg_crowd < 55 else
            "crowded"   if avg_crowd < 75 else "packed"
        )

        d = date.fromisoformat(day_str)
        days_out = (d - date.fromisoformat(today_str)).days
        day_label = "Today" if days_out == 0 else "Tomorrow" if days_out == 1 else d.strftime("%a")

        from app.services.ndbc import deg_to_label
        swell_dir_label = deg_to_label(peak["swell_dir_deg"]) if peak["swell_dir_deg"] else "--"

        daily.append({
            "date": day_str,
            "day_label": day_label,
            "face_height_min_ft": round(peak["face_height_min_ft"], 1),
            "face_height_max_ft": round(peak["face_height_max_ft"], 1),
            "face_height_label": peak["face_height_label"],
            "peak_face_ft": round(peak["face_height_max_ft"], 1),
            "peak_hour": peak["hour"],
            "swell_height_m": peak["swell_height_m"],
            "swell_period_s": round(avg_period, 1) if avg_period else None,
            "swell_dir_label": swell_dir_label,
            "swell_type_short": peak["swell_type_short"],
            "period_quality": peak["period_quality"],
            "direction_rating": peak["direction_rating"],
            "best_wind_quality": _best_wind_quality([h["wind_quality"] for h in surf_h]),
            "avg_wind_speed_mph": round(avg_wind, 1),
            "surf_rating": best_rating,
            "crowd_score": round(avg_crowd, 1),
            "crowd_level": crowd_level,
            "combo_swell": has_combo,
            "combo_label": combo_label,
        })

    return {
        "spot_id": spot_id,
        "spot_name": spot["name"],
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "daily": daily,
        "hourly": hourly,
    }
