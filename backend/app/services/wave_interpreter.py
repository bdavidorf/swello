from __future__ import annotations
"""
Translates raw buoy data (open-ocean Hs) into spot-specific breaking conditions.

The buoy measures significant wave height (Hs) — the average of the top 1/3 of waves
in open water. What actually breaks at the shore is different because of:
  1. Swell type (ground swell vs wind swell) — period determines energy and how much
     waves "jack up" as they hit shallow water
  2. Swell direction vs. spot orientation — waves blocked by headlands/islands lose energy
  3. Spot bathymetry — reefs and sand bars focus and amplify energy differently
  4. Tide — affects depth over sand bars and reefs
"""

from dataclasses import dataclass
from typing import Optional
import math


@dataclass
class BreakingConditions:
    # Raw buoy values
    buoy_hs_ft: float           # Significant wave height at buoy
    buoy_period_s: float
    buoy_dir_deg: float

    # Swell character
    swell_type: str             # e.g. "long-period ground swell"
    swell_type_short: str       # e.g. "Ground swell"
    period_quality: str         # "excellent" / "good" / "fair" / "poor"

    # Directional exposure
    swell_angle_diff: float     # degrees off ideal for this spot
    direction_rating: str       # "ideal" / "good" / "cross" / "marginal" / "blocked"
    direction_pct: float        # 0-1, how much swell is reaching this spot

    # Breaking height estimate
    breaking_hs_ft: float       # estimated breaking wave height (Hs equivalent at shore)
    face_height_min_ft: float   # wave face low estimate (surfer's measurement)
    face_height_max_ft: float   # wave face high estimate
    face_height_label: str      # e.g. "2-3ft" or "head high to overhead"

    # Explanation
    interpretation: str         # plain-English explanation
    spot_context: str           # why this spot is getting these conditions


# ─── Swell type from period ──────────────────────────────────────────────────

def _swell_type_from_period(dpd_s: float) -> tuple[str, str, str, float]:
    """Returns (type_long, type_short, period_quality, period_multiplier)."""
    if dpd_s >= 18:
        return (
            "long-period ground swell",
            "Ground swell",
            "excellent",
            1.75,
        )
    elif dpd_s >= 14:
        return (
            "ground swell",
            "Ground swell",
            "excellent",
            1.45,
        )
    elif dpd_s >= 11:
        return (
            "medium-period ground swell",
            "Ground swell",
            "good",
            1.2,
        )
    elif dpd_s >= 9:
        return (
            "mixed swell",
            "Mixed swell",
            "fair",
            1.0,
        )
    elif dpd_s >= 7:
        return (
            "wind swell",
            "Wind swell",
            "poor",
            0.75,
        )
    else:
        return (
            "short-period wind swell",
            "Wind swell",
            "poor",
            0.55,
        )


# ─── Directional exposure ─────────────────────────────────────────────────────

def _direction_exposure(mwd_deg: float, spot: dict) -> tuple[str, float, float]:
    """
    Returns (direction_rating, direction_pct, angle_diff).
    mwd_deg: direction swell is coming FROM (meteorological convention).
    """
    ideal = spot["ideal_swell_dir"]
    win_min = spot["swell_window_min"]
    win_max = spot["swell_window_max"]

    # Normalize angle difference to 0-180
    diff = abs((mwd_deg - ideal + 180) % 360 - 180)

    # Is swell inside the spot's working window?
    # Window can wrap around 360 (e.g. 310-050 for a north-facing spot)
    def in_window(d: float, lo: float, hi: float) -> bool:
        if lo <= hi:
            return lo <= d <= hi
        return d >= lo or d <= hi

    in_win = in_window(mwd_deg, win_min, win_max)

    # Direction factor using cosine decay beyond window
    if diff <= 20:
        pct = 1.0
        rating = "ideal"
    elif diff <= 40:
        pct = 0.92
        rating = "ideal"
    elif diff <= 60:
        pct = 0.78
        rating = "good"
    elif diff <= 90:
        pct = 0.58
        rating = "cross"
    elif diff <= 120:
        pct = 0.35
        rating = "marginal"
    else:
        pct = 0.12
        rating = "blocked"

    # Additional penalty if outside the spot's swell window
    if not in_win and pct > 0.35:
        pct *= 0.75
        if rating in ("ideal", "good"):
            rating = "cross"

    return rating, round(pct, 2), round(diff, 0)


# ─── Face height label ────────────────────────────────────────────────────────

def _face_height_label(lo: float, hi: float) -> str:
    """Convert ft range to surfer vernacular."""
    avg = (lo + hi) / 2
    if avg < 0.5:
        return "flat"
    elif avg < 1.5:
        return "ankle to knee"
    elif avg < 2.5:
        return "knee to waist"
    elif avg < 3.5:
        return "waist to chest"
    elif avg < 4.5:
        return "chest to head"
    elif avg < 5.5:
        return "head high"
    elif avg < 7.0:
        return "head high to overhead"
    elif avg < 9.0:
        return "overhead to double overhead"
    elif avg < 12.0:
        return "double overhead"
    else:
        return "well overhead"


# ─── Main interpreter ─────────────────────────────────────────────────────────

def interpret_breaking_conditions(
    wvht_m: float,
    dpd_s: float,
    mwd_deg: Optional[float],
    spot: dict,
) -> BreakingConditions:
    """
    Core calculation: buoy Hs → breaking wave conditions at a specific spot.
    """
    wvht_ft = wvht_m * 3.28084

    # Default swell direction to spot's ideal if missing
    if mwd_deg is None:
        mwd_deg = float(spot["ideal_swell_dir"])

    # 1. Swell type / period multiplier
    swell_type_long, swell_type_short, period_quality, period_mult = _swell_type_from_period(dpd_s)

    # 2. Directional exposure
    dir_rating, dir_pct, angle_diff = _direction_exposure(mwd_deg, spot)

    # 3. Spot-specific amplification
    exposure = float(spot.get("exposure_factor", 1.0))
    bathy = float(spot.get("bathymetry_focus", 1.0))

    # 4. Breaking Hs at shore
    breaking_hs_ft = wvht_ft * period_mult * dir_pct * exposure

    # 5. Face height (surfer measurement)
    # Breaking Hs at shore already includes period and exposure amplification.
    # Face height adds the trough-to-crest surfer measurement (~1.0-1.3x breaking Hs).
    # Bathymetry adds a small additional focusing bonus (additive, not multiplicative).
    bathy_bonus = (bathy - 1.0) * 0.3   # e.g. bathy=1.25 → +0.075
    face_mult_lo = 0.9 + bathy_bonus
    face_mult_hi = (1.2 if dpd_s >= 12 else 1.0) + bathy_bonus
    face_lo = max(0.0, breaking_hs_ft * face_mult_lo)
    face_hi = max(0.0, breaking_hs_ft * face_mult_hi)

    face_lo = round(face_lo, 1)
    face_hi = round(face_hi, 1)
    face_label = _face_height_label(face_lo, face_hi)

    # 6. Plain-English interpretation
    interpretation = _build_interpretation(
        wvht_ft, dpd_s, mwd_deg, swell_type_long, period_quality,
        dir_rating, dir_pct, angle_diff, breaking_hs_ft, face_lo, face_hi,
        face_label, spot,
    )

    spot_context = spot.get("swell_notes", "")

    return BreakingConditions(
        buoy_hs_ft=round(wvht_ft, 1),
        buoy_period_s=dpd_s,
        buoy_dir_deg=mwd_deg,
        swell_type=swell_type_long,
        swell_type_short=swell_type_short,
        period_quality=period_quality,
        swell_angle_diff=angle_diff,
        direction_rating=dir_rating,
        direction_pct=dir_pct,
        breaking_hs_ft=round(breaking_hs_ft, 1),
        face_height_min_ft=face_lo,
        face_height_max_ft=face_hi,
        face_height_label=face_label,
        interpretation=interpretation,
        spot_context=spot_context,
    )


def _build_interpretation(
    buoy_ft: float, dpd_s: float, mwd_deg: float,
    swell_type: str, period_quality: str,
    dir_rating: str, dir_pct: float, angle_diff: float,
    breaking_ft: float, face_lo: float, face_hi: float, face_label: str,
    spot: dict,
) -> str:
    lines = []

    # Swell character
    if period_quality == "excellent":
        lines.append(
            f"The buoy is reading {buoy_ft:.1f}ft of {swell_type} ({dpd_s:.0f}s period). "
            f"Long-period swells carry far more energy than the height suggests — "
            f"expect waves to jack up significantly as they hit shallow water."
        )
    elif period_quality == "good":
        lines.append(
            f"The buoy shows {buoy_ft:.1f}ft at {dpd_s:.0f}s — a solid {swell_type} "
            f"with good power. Waves will be organized and break predictably."
        )
    elif period_quality == "fair":
        lines.append(
            f"The buoy reads {buoy_ft:.1f}ft at {dpd_s:.0f}s — mixed swell energy. "
            f"Expect a combination of ground swell and local wind chop."
        )
    else:
        lines.append(
            f"The buoy shows {buoy_ft:.1f}ft but only {dpd_s:.0f}s period — "
            f"this is wind swell. Waves will be short, choppy, and lose much of their "
            f"height before reaching shore."
        )

    # Directional context
    ideal_label = spot.get("ideal_swell_dir_label", "")
    if dir_rating == "ideal":
        lines.append(
            f"Swell direction ({_dir_label(mwd_deg)}) is nearly ideal for {spot['short_name']} — "
            f"hitting the spot at its best angle."
        )
    elif dir_rating == "good":
        lines.append(
            f"Swell direction ({_dir_label(mwd_deg)}) is {angle_diff:.0f}° off ideal ({ideal_label}), "
            f"still working well — losing about {round((1-dir_pct)*100)}% of size."
        )
    elif dir_rating == "cross":
        lines.append(
            f"Swell is coming from {_dir_label(mwd_deg)}, about {angle_diff:.0f}° off the ideal {ideal_label} "
            f"direction. Only ~{round(dir_pct*100)}% of the open-ocean energy reaches this spot."
        )
    elif dir_rating == "marginal":
        lines.append(
            f"Swell direction ({_dir_label(mwd_deg)}) is marginal for {spot['short_name']} — "
            f"much of it is blocked by geography. Wave quality will be poor."
        )
    else:
        lines.append(
            f"Swell direction ({_dir_label(mwd_deg)}) is blocked for {spot['short_name']}. "
            f"Very little open-ocean energy is reaching this spot right now."
        )

    # Face height
    def _fmt(n: float) -> str:
        return f"{n:.1f}" if n < 4 else f"{n:.0f}"
    lo_s, hi_s = _fmt(face_lo), _fmt(face_hi)
    face_range = lo_s if lo_s == hi_s else f"{lo_s}–{hi_s}"
    lines.append(
        f"Expected breaking wave faces: {face_range}ft ({face_label})."
    )

    return " ".join(lines)


DIRECTIONS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]

def _dir_label(deg: float) -> str:
    return DIRECTIONS[round(deg / 22.5) % 16]
