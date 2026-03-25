from __future__ import annotations
"""
Wave power and surf rating calculations.
"""

import math
from app.models.surf import WavePower, WaveClassification, WindQuality

RHO = 1025.0    # seawater density kg/m³
G   = 9.81      # gravity m/s²
# Full energy-flux formula: P = (ρg²/64π) × Hs² × Te  (kW/m)


def wave_power_kw(wvht_m: float, period_s: float) -> float:
    if wvht_m <= 0 or period_s <= 0:
        return 0.0
    return round((RHO * G ** 2) / (64 * math.pi) * wvht_m ** 2 * period_s / 1000, 2)


def classify_wave(wvht_ft: float) -> WaveClassification:
    if wvht_ft < 0.5:   return "flat"
    if wvht_ft < 1.5:   return "ankle"
    if wvht_ft < 2.5:   return "knee"
    if wvht_ft < 3.5:   return "waist"
    if wvht_ft < 4.5:   return "chest"
    if wvht_ft < 5.5:   return "head"
    if wvht_ft < 7.5:   return "overhead"
    if wvht_ft < 12.0:  return "double-overhead"
    return "XXL"


def surf_rating(
    face_height_ft: float,
    dpd_s: float,
    wind_quality: str,
    wind_speed_mph: float = 10.0,
) -> int:
    """
    0-10 surf quality score.

    Uses the spot-adjusted breaking face height (not raw buoy Hs) so that a
    blocked spot with small waves doesn't score the same as an exposed spot
    that's firing.
    """
    if face_height_ft < 0.5:
        return 0

    # ── 1. Height score (surfer face measurement) ─────────────────────────────
    if face_height_ft < 1.5:
        height_score = 1.5    # ankle–knee: barely rideable
    elif face_height_ft < 2.5:
        height_score = 4.0    # knee–waist: fun small surf
    elif face_height_ft < 3.5:
        height_score = 5.5    # waist–chest: solid everyday surf
    elif face_height_ft < 5.0:
        height_score = 7.5    # chest–head: great
    elif face_height_ft < 7.0:
        height_score = 8.5    # head–overhead: pumping
    elif face_height_ft < 10.0:
        height_score = 7.0    # double-overhead: serious/expert
    else:
        height_score = 5.5    # XXL: big-wave specialists only

    # ── 2. Period multiplier ──────────────────────────────────────────────────
    # Long-period ground swell is more organised, more powerful, better shape
    if dpd_s >= 17:   period_mult = 1.15
    elif dpd_s >= 14: period_mult = 1.08
    elif dpd_s >= 11: period_mult = 1.00
    elif dpd_s >= 9:  period_mult = 0.88
    elif dpd_s >= 7:  period_mult = 0.70
    else:             period_mult = 0.52   # choppy wind swell

    # ── 3. Wind modifier ──────────────────────────────────────────────────────
    # Onshore wind is severely penalised — it destroys wave shape
    wind_mod = {
        "offshore":       1.00,
        "cross-offshore": 0.80,
        "cross":          0.58,
        "cross-onshore":  0.36,
        "onshore":        0.18,
    }.get(wind_quality, 0.58)

    # Very strong wind degrades even offshore sessions
    if wind_speed_mph > 25:
        wind_mod *= 0.80
    elif wind_speed_mph > 18 and wind_quality in ("onshore", "cross-onshore", "cross"):
        wind_mod *= 0.82

    raw = height_score * period_mult * wind_mod
    return min(10, max(0, round(raw)))


def build_wave_power(
    wvht_m: float,
    dpd_s: float,
    wind_quality: str = "cross",
    wind_speed_mph: float = 10.0,
    face_height_ft: float | None = None,
) -> WavePower:
    """
    Build WavePower.
    kw_per_meter and classification use raw buoy Hs (open-ocean energy proxy).
    surf_rating uses face_height_ft (spot-adjusted) when available.
    """
    kw      = wave_power_kw(wvht_m, dpd_s)
    wvht_ft = wvht_m * 3.28084
    cls     = classify_wave(wvht_ft)
    rating  = surf_rating(
        face_height_ft if face_height_ft is not None else wvht_ft,
        dpd_s, wind_quality, wind_speed_mph,
    )
    return WavePower(kw_per_meter=kw, classification=cls, surf_rating=rating)


CARDINAL_TO_DEG = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5,
    "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
}


def wind_quality_for_spot(
    wind_dir_label: str,
    wind_speed_mph: float,
    spot_offshore_dir_min: int,
    spot_offshore_dir_max: int,
) -> WindQuality:
    deg = CARDINAL_TO_DEG.get(wind_dir_label.upper(), 0)

    lo, hi = spot_offshore_dir_min, spot_offshore_dir_max

    # ── BUG FIX: correctly compute offshore center when range wraps 360° ──────
    # e.g. Topanga: lo=350, hi=120 → center is 55° (NNE), NOT (350+120)/2=235° (SW)
    if lo > hi:
        offshore_center = ((lo + hi + 360) / 2) % 360
    else:
        offshore_center = (lo + hi) / 2

    diff = abs((deg - offshore_center + 180) % 360 - 180)

    if diff < 45:
        quality = "offshore"
        label   = "Offshore"
    elif diff < 90:
        quality = "cross-offshore"
        label   = "Cross-offshore"
    elif diff < 135:
        quality = "cross"
        label   = "Cross-shore"
    elif diff < 160:
        quality = "cross-onshore"
        label   = "Cross-onshore"
    else:
        quality = "onshore"
        label   = "Onshore"

    if wind_speed_mph < 3:
        quality = "offshore"
        label   = "Glassy"

    return WindQuality(
        direction_deg=deg,
        direction_label=wind_dir_label,
        speed_mph=wind_speed_mph,
        quality=quality,
        quality_label=label,
    )
