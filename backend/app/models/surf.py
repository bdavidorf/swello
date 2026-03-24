from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class BuoyReading(BaseModel):
    station_id: str
    timestamp: datetime
    wvht_m: Optional[float] = None      # significant wave height (meters)
    wvht_ft: Optional[float] = None     # derived: wvht_m * 3.28084
    dpd_s: Optional[float] = None       # dominant period (seconds)
    apd_s: Optional[float] = None       # average period (seconds)
    mwd_deg: Optional[float] = None     # mean wave direction (degrees true)
    mwd_label: Optional[str] = None     # e.g. "SSW"
    wspd_ms: Optional[float] = None     # wind speed (m/s)
    wspd_mph: Optional[float] = None    # derived
    wdir_deg: Optional[float] = None    # wind direction (degrees true)
    wdir_label: Optional[str] = None    # e.g. "WNW"
    wtmp_c: Optional[float] = None      # water temp (Celsius)
    wtmp_f: Optional[float] = None      # derived
    atmp_c: Optional[float] = None      # air temp (Celsius)
    pres_hpa: Optional[float] = None    # pressure (hPa)
    data_age_minutes: Optional[float] = None


WaveClassification = Literal[
    "flat", "ankle", "knee", "waist", "chest", "head", "overhead", "double-overhead", "XXL"
]


class WavePower(BaseModel):
    kw_per_meter: float
    classification: WaveClassification
    surf_rating: int = Field(ge=0, le=10)


class WindQuality(BaseModel):
    direction_deg: float
    direction_label: str
    speed_mph: float
    quality: Literal["offshore", "cross-offshore", "cross", "cross-onshore", "onshore"]
    quality_label: str


class SpotMeta(BaseModel):
    id: str
    name: str
    short_name: str
    lat: float
    lon: float
    break_type: str
    difficulty: str
    facing_dir: str
    region: str
    description: str
    fame_score: float


class BreakingConditions(BaseModel):
    buoy_hs_ft: float
    buoy_period_s: float
    buoy_dir_deg: float
    swell_type: str
    swell_type_short: str
    period_quality: str
    swell_angle_diff: float
    direction_rating: str
    direction_pct: float
    breaking_hs_ft: float
    face_height_min_ft: float
    face_height_max_ft: float
    face_height_label: str
    interpretation: str
    spot_context: str


class SunTimes(BaseModel):
    date: str
    first_light: str
    first_light_display: str
    sunrise: str
    sunrise_display: str
    solar_noon_display: str
    sunset: str
    sunset_display: str
    last_light: str
    last_light_display: str
    dawn_patrol_window: dict
    daylight_hours: float
    minutes_to_sunrise: int
    minutes_to_sunset: int
    is_daytime: bool
    is_dawn_patrol_window: bool
    is_golden_hour_morning: bool


class SurfCondition(BaseModel):
    spot_id: str
    spot_name: str
    spot_short_name: str
    updated_at: datetime
    buoy: BuoyReading
    wave_power: Optional[WavePower] = None
    breaking: Optional[BreakingConditions] = None
    wind: Optional[WindQuality] = None
    crowd: Optional["CrowdPrediction"] = None
    next_tide: Optional["TideEvent"] = None
    sun: Optional[SunTimes] = None


# avoid circular import — imported from crowd.py and tide.py at runtime
from app.models.crowd import CrowdPrediction  # noqa: E402
from app.models.tide import TideEvent          # noqa: E402

SurfCondition.model_rebuild()
