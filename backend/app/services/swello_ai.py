from __future__ import annotations
"""
Swello AI — rule-based surf spot scoring and recommendation engine.

Scoring philosophy:
  Every factor produces a 0–1 sub-score. Those sub-scores are multiplied
  by their weight and summed to produce a 0–10 final score. Personalization
  shifts the optimal ranges rather than adding a flat bonus, so the same
  swell can score 9/10 for a beginner at Hermosa and 4/10 for an expert.

Weights (must sum to 1.0):
  Direction  0.25  — wrong direction = spot doesn't work, no matter what else
  Wind       0.22  — offshore vs. onshore changes wave shape entirely
  Power      0.20  — H²×T energy must match the user's skill + board
  Size       0.15  — wave height in the spot's surfable range
  Period     0.10  — longer period = more powerful and better shaped waves
  Tide       0.08  — some spots are unusable at the wrong tide
"""

import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Optional

from app.services.wave_power import wave_power_kw, CARDINAL_TO_DEG
from app.services.wave_interpreter import _direction_exposure   # reuse existing


# ── Types ─────────────────────────────────────────────────────────────────────

SkillLevel = Literal["beginner", "intermediate", "advanced", "expert"]
BoardType  = Literal["longboard", "funboard", "fish", "shortboard"]

WIND_SCORE = {
    "offshore":       1.00,
    "cross-offshore": 0.78,
    "cross":          0.48,
    "cross-onshore":  0.22,
    "onshore":        0.08,
}

# User optimal wave-power ranges (kW/m).
# Physics context: 2ft/12s ≈ 2 kW/m, 5ft/14s ≈ 12 kW/m, 8ft/16s ≈ 38 kW/m
SKILL_POWER = {
    #              (lo_ideal, hi_ideal, hard_max)
    "beginner":    (0.5,  5.0,  12.0),
    "intermediate": (2.0, 14.0,  35.0),
    "advanced":    (8.0, 32.0,  80.0),
    "expert":      (18.0, 65.0, 200.0),
}

# Board multiplier on power tolerance — longboards prefer smaller, slower waves
BOARD_POWER_SCALE = {
    "longboard":  0.55,   # prefers ~45% of skill's power range
    "funboard":   0.75,
    "fish":       0.85,
    "shortboard": 1.00,   # baseline
}

# Spot difficulty → which skills are a natural fit
DIFFICULTY_SKILL_SCORE = {
    #                     beginner  intermediate  advanced  expert
    "beginner":           [1.00,    0.75,         0.55,     0.45],
    "beginner-intermediate": [0.90, 1.00,         0.80,     0.65],
    "intermediate":       [0.60,    1.00,         0.90,     0.75],
    "intermediate-advanced": [0.35, 0.90,         1.00,     0.90],
    "advanced":           [0.10,    0.65,         1.00,     1.00],
}
SKILL_INDEX = {"beginner": 0, "intermediate": 1, "advanced": 2, "expert": 3}


@dataclass
class UserProfile:
    skill:            SkillLevel = "intermediate"
    board:            BoardType  = "shortboard"
    prefers_bigger:   bool = False
    prefers_cleaner:  bool = False
    prefers_uncrowded: bool = False


@dataclass
class ScoreBreakdown:
    direction: float   # 0-1 each
    wind:      float
    power:     float
    size:      float
    period:    float
    tide:      float

    @property
    def total(self) -> float:
        return (
            self.direction * 0.25 +
            self.wind      * 0.22 +
            self.power     * 0.20 +
            self.size      * 0.15 +
            self.period    * 0.10 +
            self.tide      * 0.08
        ) * 10.0


@dataclass
class SpotRecommendation:
    spot_id:          str
    spot_name:        str
    spot_short_name:  str
    score:            float          # 0-10
    confidence:       int            # 0-100 %
    breakdown:        ScoreBreakdown
    face_height_label: str
    wave_power_kw:    float          # kW/m (physics value)
    wave_power_label: str            # "low" / "moderate" / "high" / "powerful"
    crowd:            str            # "low" / "moderate" / "high"
    best_window_start: str           # "6:00 AM"
    best_window_end:   str           # "9:00 AM"
    reasons:          list[str]
    warnings:         list[str]
    data_age_minutes: Optional[float]


# ── Sub-score helpers ─────────────────────────────────────────────────────────

def _score_direction(mwd_deg: Optional[float], spot: dict) -> float:
    """Reuses the existing directional exposure calculator."""
    if mwd_deg is None:
        return 0.65  # unknown → neutral-ish
    _, pct, _ = _direction_exposure(mwd_deg, spot)
    return pct


def _score_size(wvht_ft: float, spot: dict, user: UserProfile) -> float:
    """
    Is the wave height in the spot's surfable range?
    Beginners get penalised for waves at the top of the range;
    advanced surfers get a bonus for bigger conditions.
    """
    lo = spot.get("ideal_wvht_min_ft", 2.0)
    hi = spot.get("ideal_wvht_max_ft", 8.0)

    # Skill adjustments: shift the preferred range up or down
    skill_shift = {"beginner": -0.5, "intermediate": 0.0, "advanced": 0.5, "expert": 1.0}
    board_shift = {"longboard": -0.5, "funboard": -0.3, "fish": -0.2, "shortboard": 0.0}
    shift = skill_shift[user.skill] + board_shift[user.board]
    lo = max(0.5, lo + shift)
    hi = hi + shift

    if user.prefers_bigger:
        hi += 1.5

    if wvht_ft < 0.5:
        return 0.0
    if wvht_ft < lo:
        # Below minimum — small penalty, still rideable
        deficit = (lo - wvht_ft) / lo
        return max(0.0, 1.0 - deficit * 0.8)
    if wvht_ft <= hi:
        return 1.0   # in the sweet spot
    # Too big — steeper penalty for beginners
    excess = (wvht_ft - hi) / hi
    penalty_rate = {"beginner": 1.6, "intermediate": 1.0, "advanced": 0.5, "expert": 0.2}
    return max(0.0, 1.0 - excess * penalty_rate[user.skill])


def _score_power(wvht_m: float, dpd_s: float, user: UserProfile) -> float:
    """
    Wave power ∝ H² × T (physics: P = ρg²/64π × Hs² × Te).
    Each user has an optimal power band; penalise outside it.
    Board type scales the tolerance: longboards prefer lower power.
    """
    kw = wave_power_kw(wvht_m, dpd_s)
    if kw <= 0:
        return 0.0

    lo_base, hi_base, hard_max = SKILL_POWER[user.skill]
    scale = BOARD_POWER_SCALE[user.board]
    lo = lo_base * scale
    hi = hi_base * scale
    hard_max_adj = hard_max * scale

    if user.prefers_bigger:
        hi *= 1.3

    if kw < lo:
        return max(0.0, kw / lo)           # ramp up to minimum
    if kw <= hi:
        return 1.0                          # ideal range
    if kw <= hard_max_adj:
        # Gradual decay above ideal
        return max(0.0, 1.0 - (kw - hi) / (hard_max_adj - hi) * 0.7)
    # Way too powerful — hard penalty
    return max(0.0, 0.3 - (kw - hard_max_adj) / hard_max_adj * 0.5)


def _score_wind(wind_quality: str, wind_speed_mph: float, user: UserProfile) -> float:
    """Clean conditions matter more to cleanliness-preferring surfers."""
    base = WIND_SCORE.get(wind_quality, 0.48)
    if wind_speed_mph < 3:      # glassy = perfect
        base = 1.0
    if user.prefers_cleaner:
        # Amplify the gap between offshore and onshore
        base = base ** 0.7      # makes 0.08 → 0.26 and 1.0 → 1.0
    return base


def _score_period(dpd_s: float) -> float:
    """
    Longer period = more energy, better shape, cleaner break.
    Linear ramp: 0 at 6s, 1.0 at 17s+.
    """
    if dpd_s <= 6:
        return 0.0
    return min(1.0, (dpd_s - 6.0) / 11.0)


def _score_tide(next_tide_event_type: Optional[str],
                next_tide_hours_away: Optional[float],
                spot: dict) -> float:
    """
    Estimate current tide phase from the next event.
    If next event is HIGH in X hours:
      X < 2h  → near high      X 2-4h  → mid-rising
      X > 4h  → near low (just passed the low)
    """
    preference = spot.get("ideal_tide", "mid")
    if not next_tide_event_type:
        return 0.70    # unknown → mild positive

    h = next_tide_hours_away or 6.0
    if next_tide_event_type == "high":
        phase = "high" if h < 2 else ("mid" if h < 4 else "low")
    else:
        phase = "low"  if h < 2 else ("mid" if h < 4 else "high")

    # preference → phase score table
    table = {
        "low":      {"low": 1.0, "mid": 0.65, "high": 0.30},
        "mid":      {"low": 0.65, "mid": 1.0, "high": 0.65},
        "mid-high": {"low": 0.40, "mid": 0.80, "high": 1.0},
        "high":     {"low": 0.30, "mid": 0.65, "high": 1.0},
    }
    return table.get(preference, {"low": 0.7, "mid": 0.7, "high": 0.7}).get(phase, 0.65)


def _score_difficulty(spot: dict, user: UserProfile) -> float:
    """Penalty when the spot's difficulty doesn't match user skill."""
    diff = spot.get("difficulty", "intermediate")
    row = DIFFICULTY_SKILL_SCORE.get(diff, DIFFICULTY_SKILL_SCORE["intermediate"])
    idx = SKILL_INDEX.get(user.skill, 1)
    return row[idx]


# ── Confidence score ──────────────────────────────────────────────────────────

def _confidence(breakdown: ScoreBreakdown, data_age_minutes: Optional[float]) -> int:
    """
    Confidence is high when:
    1. All sub-scores are in agreement (low variance → clear picture)
    2. The overall score is far from the midpoint (not borderline)
    3. Buoy data is fresh

    Confidence is low when:
    - Some factors say "great", others say "bad" (mixed signals)
    - Conditions are right on the edge of ideal/poor
    - Stale data
    """
    factors = [breakdown.direction, breakdown.wind, breakdown.power,
               breakdown.size, breakdown.period, breakdown.tide]

    mean_f = statistics.mean(factors)
    std_f  = statistics.stdev(factors) if len(factors) > 1 else 0.0

    # Agreement bonus: low variance = high confidence
    agreement = max(0.0, 1.0 - std_f * 1.5)

    # Decisiveness: conditions clearly good or clearly bad → more confident
    decisiveness = abs(mean_f - 0.5) * 2   # 0 if borderline, 1 if extreme

    raw = 0.55 * agreement + 0.30 * mean_f + 0.15 * decisiveness

    # Data freshness penalty
    age = data_age_minutes or 0.0
    freshness = 1.0 if age < 30 else (1.0 - (age - 30) / 150) if age < 180 else 0.5

    confidence = int(min(98, max(35, raw * 100 * freshness)))
    return confidence


# ── Crowd estimator ───────────────────────────────────────────────────────────

def estimate_crowd(spot: dict, score: float, hour: int, weekday: int) -> str:
    """
    Heuristic crowd estimate.
    fame_score (0-1) is the spot's baseline popularity.
    """
    base = spot.get("fame_score", 0.5)

    # Time of day
    if hour <= 6:
        time_f = 0.35       # very early → nearly empty
    elif hour <= 8:
        time_f = 0.65       # dawn patrol
    elif hour <= 10:
        time_f = 0.90
    elif hour <= 14:
        time_f = 1.25       # midday peak
    elif hour <= 17:
        time_f = 1.0
    else:
        time_f = 0.70

    day_f = 1.45 if weekday >= 5 else 1.0   # weekends +45%
    quality_f = 0.5 + score / 10 * 1.0      # 0.5 (flat) to 1.5 (firing)

    crowd_index = base * time_f * day_f * quality_f

    if crowd_index < 0.30:
        return "low"
    if crowd_index < 0.65:
        return "moderate"
    return "high"


# ── Best time window ──────────────────────────────────────────────────────────

def best_time_window(nws_hourly: list[dict], spot: dict, user: UserProfile) -> tuple[str, str]:
    """
    Find the best 3-hour window in the next 12 hours based on wind quality.
    Swell changes slowly, so wind is the key variable we can predict.

    nws_hourly: list of {"hour": int, "wind_quality": str, "wind_speed_mph": float}
    Returns ("6:00 AM", "9:00 AM") style strings.
    """
    if not nws_hourly:
        # Default to dawn patrol as a heuristic
        now_h = datetime.now().hour
        start = max(5, now_h + 1)
        end = start + 3
        return _fmt_hour(start), _fmt_hour(end)

    # Score each hour by wind quality
    scored = []
    for pt in nws_hourly[:12]:
        wq = pt.get("wind_quality", "cross")
        ws = pt.get("wind_speed_mph", 10.0)
        h  = pt.get("hour", 8)
        w_score = _score_wind(wq, ws, user)
        # Early morning bonus (before sea breeze)
        morning_bonus = 0.1 if 5 <= h <= 9 else 0.0
        scored.append((h, w_score + morning_bonus))

    if not scored:
        return "6:00 AM", "9:00 AM"

    # Find best consecutive 3-hour window
    best_sum = -1.0
    best_start_h = scored[0][0]
    for i in range(len(scored) - 2):
        window_sum = sum(s for _, s in scored[i:i+3])
        if window_sum > best_sum:
            best_sum = window_sum
            best_start_h = scored[i][0]

    return _fmt_hour(best_start_h), _fmt_hour(best_start_h + 3)


def _fmt_hour(h: int) -> str:
    h = h % 24
    if h == 0:
        return "12:00 AM"
    if h < 12:
        return f"{h}:00 AM"
    if h == 12:
        return "12:00 PM"
    return f"{h - 12}:00 PM"


# ── Reason generation ─────────────────────────────────────────────────────────

def _wave_power_label(kw: float) -> str:
    if kw < 2:   return "minimal"
    if kw < 6:   return "low"
    if kw < 14:  return "moderate"
    if kw < 30:  return "high"
    return "powerful"


def _generate_reasons(
    breakdown: ScoreBreakdown,
    spot: dict,
    user: UserProfile,
    wind_quality: str,
    wind_dir_label: str,
    mwd_label: Optional[str],
    dpd_s: float,
    wvht_ft: float,
    kw: float,
    crowd: str,
) -> tuple[list[str], list[str]]:
    reasons: list[str] = []
    warnings: list[str] = []

    # Direction
    if breakdown.direction >= 0.90:
        ideal = spot.get("ideal_swell_dir_label", "")
        reasons.append(f"Swell hitting {spot['short_name']} at its best angle ({ideal})")
    elif breakdown.direction >= 0.70:
        reasons.append(f"{mwd_label or 'Swell'} direction is working for this break")
    elif breakdown.direction < 0.40:
        warnings.append("Swell direction is off — much of the energy is blocked")

    # Wind
    if breakdown.wind >= 0.90:
        reasons.append(f"Offshore {wind_dir_label} wind ({spot.get('offshore_wind_label','')})"
                       if wind_dir_label else "Clean offshore conditions")
    elif breakdown.wind >= 0.70:
        reasons.append("Light cross-offshore wind — waves should be groomed")
    elif breakdown.wind < 0.35:
        warnings.append(f"Onshore wind ({wind_dir_label}) is chopping up the surface")

    # Power / skill match
    if breakdown.power >= 0.85:
        reasons.append(f"Wave energy matched to {user.skill} level"
                       + (" on a longboard" if user.board == "longboard" else ""))
    elif breakdown.power < 0.35:
        skill_dir = "too powerful" if kw > 14 and user.skill in ("beginner", "intermediate") else "too small"
        warnings.append(f"Wave power ({_wave_power_label(kw)}) may be {skill_dir} for your level")

    # Period
    if dpd_s >= 14:
        reasons.append(f"Long-period ground swell ({dpd_s:.0f}s) — powerful and well-shaped")
    elif dpd_s >= 11:
        reasons.append(f"Solid {dpd_s:.0f}s period — organized waves")
    elif dpd_s < 8:
        warnings.append(f"Short {dpd_s:.0f}s period — expect choppy, short-lived rides")

    # Size
    if breakdown.size >= 0.90:
        reasons.append(f"Wave size ({wvht_ft:.1f}ft) right in the sweet spot for this spot")
    elif breakdown.size < 0.40:
        if wvht_ft < spot.get("ideal_wvht_min_ft", 2.0):
            warnings.append("Waves are smaller than ideal — may need more swell")
        else:
            warnings.append("Waves are larger than typical — check skill match")

    # Tide
    if breakdown.tide >= 0.85:
        reasons.append(f"Tide is in its preferred range for {spot['short_name']}")
    elif breakdown.tide < 0.45:
        warnings.append(f"Tide is not ideal — {spot.get('ideal_tide','mid')} tide works best here")

    # Crowd
    if user.prefers_uncrowded and crowd == "high":
        warnings.append("Likely to be crowded — consider going early morning")
    elif user.prefers_uncrowded and crowd == "low":
        reasons.append("Low crowd expected at this time")

    # Break type / difficulty reward
    diff = spot.get("difficulty", "intermediate")
    if user.skill == "beginner" and "beginner" in diff:
        reasons.append(f"Forgiving break type ({spot.get('break_type','beach')}) — great for your level")
    elif user.skill in ("advanced", "expert") and "advanced" in diff:
        reasons.append(f"{spot.get('break_type','').capitalize()} break with performance potential")

    # Keep concise — top 4 reasons, top 2 warnings
    return reasons[:4], warnings[:2]


# ── Main scoring function ─────────────────────────────────────────────────────

def score_spot(
    buoy_wvht_m: float,
    buoy_wvht_ft: float,
    buoy_dpd_s: float,
    buoy_mwd_deg: Optional[float],
    buoy_mwd_label: Optional[str],
    wind_quality: str,
    wind_speed_mph: float,
    wind_dir_label: str,
    next_tide_event_type: Optional[str],
    next_tide_hours_away: Optional[float],
    spot: dict,
    user: UserProfile,
    data_age_minutes: Optional[float] = None,
    nws_hourly: Optional[list[dict]] = None,
) -> SpotRecommendation:
    """
    Score a single spot against current conditions and user profile.
    Returns a SpotRecommendation with score, breakdown, reasons, and crowd estimate.
    """
    kw = wave_power_kw(buoy_wvht_m, buoy_dpd_s)

    # ── Compute sub-scores ────────────────────────────────────────────────────
    bd = ScoreBreakdown(
        direction = _score_direction(buoy_mwd_deg, spot),
        wind      = _score_wind(wind_quality, wind_speed_mph, user),
        power     = _score_power(buoy_wvht_m, buoy_dpd_s, user),
        size      = _score_size(buoy_wvht_ft, spot, user),
        period    = _score_period(buoy_dpd_s),
        tide      = _score_tide(next_tide_event_type, next_tide_hours_away, spot),
    )

    # Apply difficulty match as a multiplier on the total (0.10–1.00)
    diff_multiplier = _score_difficulty(spot, user)
    raw_score = bd.total * (0.70 + diff_multiplier * 0.30)

    final_score = round(min(10.0, max(0.0, raw_score)), 1)
    confidence  = _confidence(bd, data_age_minutes)

    # ── Crowd + time window ───────────────────────────────────────────────────
    now = datetime.now()
    crowd = estimate_crowd(spot, final_score, now.hour, now.weekday())

    nws_pts = nws_hourly or []
    win_start, win_end = best_time_window(nws_pts, spot, user)

    # ── Labels ───────────────────────────────────────────────────────────────
    from app.services.wave_interpreter import interpret_breaking_conditions
    bc = interpret_breaking_conditions(buoy_wvht_m, buoy_dpd_s, buoy_mwd_deg, spot)
    face_label = bc.face_height_label

    # ── Reasons / warnings ───────────────────────────────────────────────────
    reasons, warnings = _generate_reasons(
        bd, spot, user,
        wind_quality, wind_dir_label, buoy_mwd_label,
        buoy_dpd_s, buoy_wvht_ft, kw, crowd,
    )

    return SpotRecommendation(
        spot_id           = spot["id"],
        spot_name         = spot["name"],
        spot_short_name   = spot["short_name"],
        score             = final_score,
        confidence        = confidence,
        breakdown         = bd,
        face_height_label = face_label,
        wave_power_label  = _wave_power_label(kw),
        crowd             = crowd,
        best_window_start = win_start,
        best_window_end   = win_end,
        reasons           = reasons,
        warnings          = warnings,
        data_age_minutes  = data_age_minutes,
    )
