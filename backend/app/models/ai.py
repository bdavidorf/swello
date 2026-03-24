from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class UserPreferences(BaseModel):
    min_wave_height_ft: float = Field(default=2.0, ge=0, le=30)
    max_wave_height_ft: float = Field(default=8.0, ge=0, le=30)
    preferred_period_s: float = Field(default=12.0, ge=5, le=25)
    max_wind_speed_mph: float = Field(default=12.0, ge=0, le=60)
    max_crowd_score: float = Field(default=60.0, ge=0, le=100)
    experience_level: Literal["beginner", "intermediate", "advanced", "expert"] = "intermediate"
    preferred_spots: Optional[list[str]] = None


class SpotWindow(BaseModel):
    spot_id: str
    spot_name: str
    start: datetime
    end: datetime
    wave_height_ft: float
    period_s: float
    crowd_score: float
    wind_quality: str
    composite_score: float = Field(ge=0, le=1)
    why: str


class AIRankingRequest(BaseModel):
    preferences: UserPreferences
    forecast_horizon_hours: int = Field(default=48, ge=6, le=168)
    spots: Optional[list[str]] = None


class AIRankingResponse(BaseModel):
    ranked_windows: list[SpotWindow]
    explanation: str
    top_pick: str
    top_pick_time: str
    generated_at: datetime
    model_used: str
