from __future__ import annotations
from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class TidePrediction(BaseModel):
    timestamp: datetime
    height_ft: float


class TideEvent(BaseModel):
    event_type: Literal["high", "low"]
    timestamp: datetime
    height_ft: float
    hours_away: Optional[float] = None


class TideWindow(BaseModel):
    station_id: str
    generated_at: datetime
    predictions: list[TidePrediction]   # hourly for 7 days
    events: list[TideEvent]             # only high/low turning points


from typing import Optional
TideEvent.model_rebuild()
