from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import asyncio
import math

import os
import httpx

from app.config import get_spots
from app.services.ndbc import fetch_buoy_with_fallback
from app.services.nws import fetch_hourly_forecast
from app.services.wave_power import wind_quality_for_spot, CARDINAL_TO_DEG
from app.services.coops import fetch_tide_predictions
from app.ml.crowd_model import predict_crowd
from app.services.swello_ai import (
    UserProfile, SpotRecommendation, score_spot,
    SkillLevel, BoardType,
)

router = APIRouter(prefix="/swello-ai", tags=["swello-ai"])


# ── Request / Response models ─────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


class RecommendRequest(BaseModel):
    skill:             SkillLevel = "intermediate"
    board:             BoardType  = "shortboard"
    prefers_bigger:    bool = False
    prefers_cleaner:   bool = False
    prefers_uncrowded: bool = False
    lat:               Optional[float] = None   # user's GPS latitude
    lon:               Optional[float] = None   # user's GPS longitude


class BreakdownOut(BaseModel):
    direction: float
    wind:      float
    power:     float
    size:      float
    period:    float
    tide:      float


class SpotPickOut(BaseModel):
    spot_id:           str
    spot_name:         str
    spot_short_name:   str
    score:             float
    confidence:        int
    breakdown:         BreakdownOut
    face_height_label: str
    wave_power_label:  str
    crowd:             str
    best_window_start: str
    best_window_end:   str
    reasons:           list[str]
    warnings:          list[str]
    data_age_minutes:  Optional[float]
    distance_km:       Optional[float] = None


class RecommendResponse(BaseModel):
    top_picks:          list[SpotPickOut]
    generated_at:       str
    conditions_summary: str
    ai_narrative:       str = ""


# ── Data fetcher per spot ─────────────────────────────────────────────────────

async def _fetch_spot_data(spot: dict) -> Optional[dict]:
    """Fetch live data for one spot. Returns None on failure."""
    try:
        buoy, nws_raw, tide_data = await asyncio.gather(
            fetch_buoy_with_fallback(spot["buoy_primary"], spot["buoy_fallback"]),
            fetch_hourly_forecast(spot["lat"], spot["lon"]),
            fetch_tide_predictions(spot["tide_station"], days=1),
            return_exceptions=True,
        )
    except Exception:
        return None

    if buoy is None or isinstance(buoy, BaseException):
        return None
    if isinstance(nws_raw, BaseException):
        nws_raw = []
    if isinstance(tide_data, BaseException):
        tide_data = None

    # Current wind from NWS
    current_nws = nws_raw[0] if nws_raw else None
    wind_q = None
    if current_nws:
        wind_q = wind_quality_for_spot(
            current_nws.wind_dir,
            current_nws.wind_speed_mph,
            spot["offshore_wind_dir_min"],
            spot["offshore_wind_dir_max"],
        )

    # Next tide event
    next_tide = None
    if tide_data and tide_data.events:
        future = [e for e in tide_data.events if e.hours_away and e.hours_away > 0]
        if future:
            next_tide = future[0]

    # NWS hourly for time window (compact)
    nws_hourly = []
    for pt in (nws_raw or [])[:12]:
        wq = wind_quality_for_spot(
            pt.wind_dir, pt.wind_speed_mph,
            spot["offshore_wind_dir_min"], spot["offshore_wind_dir_max"],
        )
        nws_hourly.append({
            "hour": pt.timestamp.hour,
            "wind_quality": wq.quality,
            "wind_speed_mph": pt.wind_speed_mph,
        })

    return {
        "spot": spot,
        "buoy": buoy,
        "wind_q": wind_q,
        "next_tide": next_tide,
        "nws_hourly": nws_hourly,
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest):
    user = UserProfile(
        skill=request.skill,
        board=request.board,
        prefers_bigger=request.prefers_bigger,
        prefers_cleaner=request.prefers_cleaner,
        prefers_uncrowded=request.prefers_uncrowded,
    )

    all_spots = get_spots()

    # Filter to nearby spots if user location provided (within 250 km).
    # Fall back to all spots if fewer than 5 are found in that radius.
    if request.lat is not None and request.lon is not None:
        nearby = [s for s in all_spots
                  if _haversine_km(request.lat, request.lon, s["lat"], s["lon"]) <= 250]
        spots = nearby if len(nearby) >= 5 else all_spots
    else:
        spots = all_spots

    tasks = [_fetch_spot_data(s) for s in spots]
    results = await asyncio.gather(*tasks)

    recommendations: list[SpotRecommendation] = []
    for r in results:
        if r is None:
            continue
        spot    = r["spot"]
        buoy    = r["buoy"]
        wind_q  = r["wind_q"]
        nt      = r["next_tide"]

        if not buoy.wvht_m or not buoy.dpd_s:
            continue

        rec = score_spot(
            buoy_wvht_m            = buoy.wvht_m,
            buoy_wvht_ft           = buoy.wvht_ft or buoy.wvht_m * 3.28084,
            buoy_dpd_s             = buoy.dpd_s,
            buoy_mwd_deg           = buoy.mwd_deg,
            buoy_mwd_label         = buoy.mwd_label,
            wind_quality           = wind_q.quality  if wind_q else "cross",
            wind_speed_mph         = wind_q.speed_mph if wind_q else 10.0,
            wind_dir_label         = wind_q.direction_label if wind_q else "--",
            next_tide_event_type   = nt.event_type   if nt else None,
            next_tide_hours_away   = nt.hours_away    if nt else None,
            spot                   = spot,
            user                   = user,
            data_age_minutes       = buoy.data_age_minutes,
            nws_hourly             = r["nws_hourly"],
        )
        recommendations.append(rec)

    # Sort by score descending
    recommendations.sort(key=lambda x: x.score, reverse=True)
    top3 = recommendations[:3]

    # Conditions summary (use first spot's buoy data as it's shared)
    summary = "No data available"
    first_buoy = next((r["buoy"] for r in results if r and r["buoy"].wvht_ft), None)
    if first_buoy:
        summary = (
            f"{first_buoy.wvht_ft:.1f}ft @ {first_buoy.dpd_s:.0f}s "
            f"from {first_buoy.mwd_label or '--'} — "
            f"water {first_buoy.wtmp_f:.0f}°F" if first_buoy.wtmp_f else
            f"{first_buoy.wvht_ft:.1f}ft @ {first_buoy.dpd_s:.0f}s from {first_buoy.mwd_label or '--'}"
        )

    # Compute distance from user for each top pick
    dist_map: dict[str, float] = {}
    if request.lat is not None and request.lon is not None:
        for r in results:
            if r:
                s = r["spot"]
                dist_map[s["id"]] = round(_haversine_km(
                    request.lat, request.lon, s["lat"], s["lon"]
                ), 1)

    def _to_out(r: SpotRecommendation) -> SpotPickOut:
        return SpotPickOut(
            spot_id           = r.spot_id,
            spot_name         = r.spot_name,
            spot_short_name   = r.spot_short_name,
            score             = r.score,
            confidence        = r.confidence,
            breakdown         = BreakdownOut(**{
                k: round(getattr(r.breakdown, k), 2)
                for k in ("direction","wind","power","size","period","tide")
            }),
            face_height_label = r.face_height_label,
            wave_power_label  = r.wave_power_label,
            crowd             = r.crowd,
            best_window_start = r.best_window_start,
            best_window_end   = r.best_window_end,
            reasons           = r.reasons,
            warnings          = r.warnings,
            data_age_minutes  = r.data_age_minutes,
            distance_km       = dist_map.get(r.spot_id),
        )

    top3_out = [_to_out(r) for r in top3]

    # AI narrative — conversational picks explanation
    narrative = await _generate_picks_narrative(
        top3_out, request.skill, request.board,
        has_location=(request.lat is not None),
    )

    return RecommendResponse(
        top_picks          = top3_out,
        generated_at       = datetime.now(tz=timezone.utc).isoformat(),
        conditions_summary = summary,
        ai_narrative       = narrative,
    )


async def _generate_picks_narrative(
    picks: list[SpotPickOut],
    skill: str,
    board: str,
    has_location: bool,
) -> str:
    """Generate a conversational 2-3 sentence picks narrative using Groq (fast, free)."""
    if not picks:
        return ""

    def _dist_str(p: SpotPickOut) -> str:
        if p.distance_km is None:
            return ""
        mi = round(p.distance_km * 0.621, 0)
        return f" (~{int(mi)} mi away)"

    lines = [
        f"{i+1}. {p.spot_name}{_dist_str(p)}: {p.face_height_label}, {p.crowd} crowd, score {p.score:.1f}/10"
        for i, p in enumerate(picks)
    ]
    picks_text = "\n".join(lines)
    location_note = "User location is known." if has_location else "No user location — ignore distance references."

    prompt = (
        f"You are Swello, a chill surf advisor. The surfer is a {skill} on a {board}.\n"
        f"{location_note}\n"
        f"Today's top 3 spots:\n{picks_text}\n\n"
        "Write 2-3 sentences in a casual surfer tone explaining these picks. "
        "Highlight the best pick, mention the trade-off between distance and quality if locations differ, "
        "and give the vibe — like talking to a friend at the lineup. "
        "No lists, no emojis, no markdown. Max 70 words."
    )

    groq_key = os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 120,
                        "temperature": 0.7,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    # Fallback: template narrative
    best = picks[0]
    if len(picks) >= 2 and picks[1].distance_km and picks[0].distance_km:
        far_name  = max(picks[:2], key=lambda p: p.distance_km or 0).spot_name
        near_name = min(picks[:2], key=lambda p: p.distance_km or 0).spot_name
        return (
            f"Your best bet today is {best.spot_name} — {best.face_height_label} with {best.crowd.lower()} crowds. "
            f"If you're willing to make the drive, {far_name} is worth it. "
            f"Staying local? {near_name} will still get you waves."
        )
    return f"Top pick today is {best.spot_name} — {best.face_height_label}, {best.wave_power_label} power, {best.crowd.lower()} crowds. Score: {best.score:.1f}/10."
