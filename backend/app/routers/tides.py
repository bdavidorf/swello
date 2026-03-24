from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from app.config import get_spot_by_id
from app.services.coops import fetch_tide_predictions
from app.models.tide import TideWindow, TideEvent

router = APIRouter(prefix="/tides", tags=["tides"])


@router.get("/{spot_id}", response_model=TideWindow)
async def spot_tides(
    spot_id: str,
    days: int = Query(default=7, ge=1, le=10),
):
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")

    data = await fetch_tide_predictions(spot["tide_station"], days=days)
    if not data:
        raise HTTPException(503, "Tide data unavailable")
    return data


@router.get("/{spot_id}/next", response_model=TideEvent)
async def next_tide_event(spot_id: str):
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")

    data = await fetch_tide_predictions(spot["tide_station"], days=2)
    if not data or not data.events:
        raise HTTPException(503, "Tide data unavailable")

    # First future event
    from datetime import datetime
    future = [e for e in data.events if e.hours_away and e.hours_away > 0]
    if not future:
        raise HTTPException(404, "No future tide events found")
    return future[0]
