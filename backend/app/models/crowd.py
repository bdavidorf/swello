from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


CrowdLevel = Literal["empty", "uncrowded", "moderate", "crowded", "packed"]


class CrowdFeatures(BaseModel):
    spot_id: str
    wvht_m: float = Field(ge=0, le=20)
    dpd_s: float = Field(ge=0, le=30)
    wind_speed_ms: float = Field(ge=0, le=50)
    wind_dir_deg: float = Field(ge=0, le=360)
    hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    month: int = Field(ge=1, le=12)
    is_holiday: bool
    is_weekend: bool
    is_school_break: bool


class CrowdPrediction(BaseModel):
    score: float = Field(ge=0, le=100)          # 0=empty, 100=insane
    level: CrowdLevel
    confidence: float = Field(ge=0, le=1)
    peak_hour_today: Optional[int] = None       # hour of day (local) when crowd peaks


class HourlyCrowd(BaseModel):
    hour: int
    score: float
    level: CrowdLevel


class DailyCrowdForecast(BaseModel):
    spot_id: str
    date: datetime
    hourly: list[HourlyCrowd]
    peak_hour: int
    peak_score: float
    best_hour: int      # least crowded during typical surf window (6am-6pm)
    best_score: float


def score_to_level(score: float) -> CrowdLevel:
    if score < 15:
        return "empty"
    elif score < 35:
        return "uncrowded"
    elif score < 55:
        return "moderate"
    elif score < 75:
        return "crowded"
    else:
        return "packed"
