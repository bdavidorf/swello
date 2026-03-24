from __future__ import annotations
from fastapi import APIRouter, HTTPException
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

from app.config import get_spot_by_id, get_settings
from app.models.crowd import CrowdFeatures, CrowdPrediction, DailyCrowdForecast, HourlyCrowd, score_to_level
from app.ml.crowd_model import predict_crowd
from app.services.popular_times import (
    log_crowd_report, get_recent_reports, get_report_count,
    fetch_all_spots, get_popularity_at,
)

router = APIRouter(prefix="/crowd", tags=["crowd"])
settings = get_settings()

LEVEL_TO_SCORE = {
    "empty": 10,
    "uncrowded": 28,
    "moderate": 48,
    "crowded": 68,
    "packed": 88,
}


class CrowdReportRequest(BaseModel):
    spot_id: str
    crowd_level: str = Field(pattern="^(empty|uncrowded|moderate|crowded|packed)$")
    wvht_ft: Optional[float] = None
    dpd_s: Optional[float] = None
    wind_mph: Optional[float] = None
    wind_dir: Optional[str] = None


@router.post("/report")
async def submit_crowd_report(body: CrowdReportRequest):
    """User-submitted crowd observation."""
    spot = get_spot_by_id(body.spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{body.spot_id}' not found")

    score = LEVEL_TO_SCORE[body.crowd_level]
    row_id = log_crowd_report(
        spot_id=body.spot_id,
        crowd_level=body.crowd_level,
        crowd_score=score,
        wvht_ft=body.wvht_ft,
        dpd_s=body.dpd_s,
        wind_mph=body.wind_mph,
        wind_dir=body.wind_dir,
        source="user",
    )
    counts = get_report_count()
    total = counts.get(body.spot_id, 0)
    return {
        "success": True,
        "report_id": row_id,
        "spot_id": body.spot_id,
        "crowd_level": body.crowd_level,
        "total_reports_for_spot": total,
        "message": f"Thanks! {total} real report{'s' if total != 1 else ''} logged for {spot['short_name']}.",
    }


@router.get("/reports/{spot_id}")
async def crowd_reports(spot_id: str, limit: int = 50):
    """Recent crowd reports for a spot."""
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404)
    return {
        "spot_id": spot_id,
        "reports": get_recent_reports(spot_id, limit),
    }


@router.get("/stats")
async def crowd_stats():
    """Total user-submitted reports per spot."""
    return {"report_counts": get_report_count()}


@router.post("/fetch-popular-times")
async def fetch_popular_times():
    """
    Seed the DB with Google Popular Times data.
    Requires GOOGLE_PLACES_API_KEY in .env.
    """
    api_key = getattr(settings, "google_places_api_key", "")
    if not api_key:
        raise HTTPException(400, "Set GOOGLE_PLACES_API_KEY in .env to use this endpoint.")
    results = fetch_all_spots(api_key)
    success = sum(1 for v in results.values() if v)
    return {"results": results, "success_count": success}


@router.post("/predict", response_model=CrowdPrediction)
async def predict(features: CrowdFeatures):
    return predict_crowd(
        spot_id=features.spot_id,
        wvht_m=features.wvht_m,
        dpd_s=features.dpd_s,
        wind_speed_ms=features.wind_speed_ms,
        wind_dir_deg=features.wind_dir_deg,
        dt=datetime(datetime.now().year, datetime.now().month, datetime.now().day, features.hour),
    )


@router.get("/{spot_id}/today", response_model=DailyCrowdForecast)
async def crowd_today(spot_id: str):
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")

    today = datetime.now()
    hourly = []
    for h in range(6, 20):
        dt = today.replace(hour=h, minute=0, second=0, microsecond=0)

        # Blend: use Google popular times if available, else ML model
        google_pop = get_popularity_at(spot_id, dt)
        pred = predict_crowd(
            spot_id=spot_id,
            wvht_m=1.0,
            dpd_s=10.0,
            wind_speed_ms=3.0,
            wind_dir_deg=90.0,
            dt=dt,
        )
        # Weight Google data 70% if available
        score = pred.score
        if google_pop is not None:
            score = google_pop * 0.7 + pred.score * 0.3

        hourly.append(HourlyCrowd(hour=h, score=round(score, 1), level=score_to_level(score)))

    scores = [h.score for h in hourly]
    peak_idx = max(range(len(scores)), key=lambda i: scores[i])
    best_idx = min(range(len(scores)), key=lambda i: scores[i])

    return DailyCrowdForecast(
        spot_id=spot_id,
        date=today,
        hourly=hourly,
        peak_hour=hourly[peak_idx].hour,
        peak_score=hourly[peak_idx].score,
        best_hour=hourly[best_idx].hour,
        best_score=hourly[best_idx].score,
    )
