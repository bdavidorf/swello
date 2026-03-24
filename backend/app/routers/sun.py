from __future__ import annotations
from fastapi import APIRouter, HTTPException
from app.config import get_spot_by_id
from app.services.sun_times import get_sun_times

router = APIRouter(prefix="/sun", tags=["sun"])


@router.get("/{spot_id}")
async def spot_sun_times(spot_id: str):
    spot = get_spot_by_id(spot_id)
    if not spot:
        raise HTTPException(404, f"Spot '{spot_id}' not found")
    return get_sun_times(spot["lat"], spot["lon"])
