from __future__ import annotations
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from app.models.ai import AIRankingRequest, AIRankingResponse
from app.config import get_spots, get_spot_by_id
from app.services.nws import fetch_hourly_forecast
from app.services.ndbc import fetch_buoy_with_fallback
from app.services.wave_power import wind_quality_for_spot, CARDINAL_TO_DEG
from app.ml.crowd_model import predict_crowd
from app.services.claude_client import get_ai_ranking
import asyncio

router = APIRouter(prefix="/ai", tags=["ai"])


async def _build_spot_forecast_summary(spot: dict, hours: int = 48) -> dict:
    """Compact forecast for feeding to Claude (keep token count reasonable)."""
    try:
        nws = await fetch_hourly_forecast(spot["lat"], spot["lon"])
        buoy = await fetch_buoy_with_fallback(spot["buoy_primary"], spot["buoy_fallback"])
    except Exception:
        return {}

    windows = []
    for pt in (nws or [])[:hours:3]:  # every 3 hours to save tokens
        wind_deg = CARDINAL_TO_DEG.get(pt.wind_dir.upper(), 270)
        wind = wind_quality_for_spot(
            pt.wind_dir, pt.wind_speed_mph,
            spot["offshore_wind_dir_min"], spot["offshore_wind_dir_max"],
        )
        wvht_m = max(0.3, (buoy.wvht_m or 1.0))
        dpd_s = buoy.dpd_s or 10.0
        crowd = predict_crowd(
            spot_id=spot["id"],
            wvht_m=wvht_m,
            dpd_s=dpd_s,
            wind_speed_ms=pt.wind_speed_mph * 0.44704,
            wind_dir_deg=wind_deg,
            dt=pt.timestamp.replace(tzinfo=None),
        )
        windows.append({
            "time": pt.timestamp.strftime("%a %b %d %I%p"),
            "wave_ft": round(wvht_m * 3.28084, 1),
            "period_s": dpd_s,
            "wind_mph": pt.wind_speed_mph,
            "wind_dir": pt.wind_dir,
            "wind_quality": wind.quality,
            "crowd": round(crowd.score),
            "crowd_level": crowd.level,
        })

    return {
        "spot_id": spot["id"],
        "spot_name": spot["name"],
        "break_type": spot["break_type"],
        "difficulty": spot["difficulty"],
        "facing": spot["facing_dir"],
        "windows": windows,
    }


@router.post("/rank-spots", response_model=AIRankingResponse)
async def rank_spots(request: AIRankingRequest):
    all_spots = get_spots()
    if request.spots:
        all_spots = [s for s in all_spots if s["id"] in request.spots]

    tasks = [_build_spot_forecast_summary(s, request.forecast_horizon_hours) for s in all_spots]
    summaries = await asyncio.gather(*tasks)
    forecast_data = [s for s in summaries if s]

    return await get_ai_ranking(request, forecast_data)
