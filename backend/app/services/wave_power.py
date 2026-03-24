"""
Wave power and surf rating calculations.
"""

import math
from app.models.surf import WavePower, WaveClassification, WindQuality

# Simplified wave power formula (proportional to energy flux)
# P ≈ 0.5 * Hs^2 * Te (kW/m) where Hs in meters, Te in seconds
RHO = 1025.0    # seawater density kg/m3
G = 9.81        # gravity m/s2
# Full formula: P = (rho * g^2) / (64 * pi) * Hs^2 * Te


def wave_power_kw(wvht_m: float, period_s: float) -> float:
    if wvht_m <= 0 or period_s <= 0:
        return 0.0
    P = (RHO * G ** 2) / (64 * math.pi) * wvht_m ** 2 * period_s / 1000  # kW/m
    return round(P, 2)


def classify_wave(wvht_ft: float) -> WaveClassification:
    if wvht_ft < 0.5:
        return "flat"
    elif wvht_ft < 1.5:
        return "ankle"
    elif wvht_ft < 2.5:
        return "knee"
    elif wvht_ft < 3.5:
        return "waist"
    elif wvht_ft < 4.5:
        return "chest"
    elif wvht_ft < 5.5:
        return "head"
    elif wvht_ft < 7.5:
        return "overhead"
    elif wvht_ft < 12.0:
        return "double-overhead"
    else:
        return "XXL"


def surf_rating(wvht_ft: float, dpd_s: float, wind_quality: str) -> int:
    """0-10 surf quality score."""
    if wvht_ft < 0.5:
        return 0

    # Base score from height (optimal ~4-6ft)
    if wvht_ft <= 2:
        height_score = wvht_ft / 2 * 4         # 0-4
    elif wvht_ft <= 6:
        height_score = 4 + (wvht_ft - 2) / 4 * 4  # 4-8
    elif wvht_ft <= 10:
        height_score = 8 - (wvht_ft - 6) / 4 * 2  # 8-6 (getting too big for most)
    else:
        height_score = max(4, 6 - (wvht_ft - 10) * 0.5)

    # Period bonus (longer = more powerful/quality)
    period_bonus = min(2, max(0, (dpd_s - 8) / 6))  # 0 at 8s, +2 at 20s

    # Wind penalty/bonus
    wind_mod = {
        "offshore": 1.0,
        "cross-offshore": 0.85,
        "cross": 0.65,
        "cross-onshore": 0.45,
        "onshore": 0.25,
    }.get(wind_quality, 0.65)

    raw = (height_score + period_bonus) * wind_mod
    return min(10, max(0, round(raw)))


def build_wave_power(wvht_m: float, dpd_s: float, wind_quality: str = "cross") -> WavePower:
    kw = wave_power_kw(wvht_m, dpd_s)
    wvht_ft = wvht_m * 3.28084
    cls = classify_wave(wvht_ft)
    rating = surf_rating(wvht_ft, dpd_s, wind_quality)
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

    # Determine if wind is offshore for this spot
    lo, hi = spot_offshore_dir_min, spot_offshore_dir_max
    if lo <= hi:
        is_offshore_range = lo <= deg <= hi
    else:  # wraps around 360
        is_offshore_range = deg >= lo or deg <= hi

    # Angle difference from ideal offshore center
    offshore_center = (lo + hi) / 2
    diff = abs((deg - offshore_center + 180) % 360 - 180)

    if diff < 45:
        quality = "offshore"
        label = "Offshore"
    elif diff < 90:
        quality = "cross-offshore"
        label = "Cross-offshore"
    elif diff < 135:
        quality = "cross"
        label = "Cross-shore"
    elif diff < 160:
        quality = "cross-onshore"
        label = "Cross-onshore"
    else:
        quality = "onshore"
        label = "Onshore"

    if wind_speed_mph < 3:
        quality = "offshore"
        label = "Glassy"

    return WindQuality(
        direction_deg=deg,
        direction_label=wind_dir_label,
        speed_mph=wind_speed_mph,
        quality=quality,
        quality_label=label,
    )
