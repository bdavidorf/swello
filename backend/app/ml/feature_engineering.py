"""
Calendar and wave feature engineering for crowd prediction.
"""

import math
from datetime import datetime, date
import holidays as holidays_lib


CA_HOLIDAYS = holidays_lib.country_holidays("US", state="CA")

# Approximate CA school break windows (month, day start) -> (month, day end)
SCHOOL_BREAKS = [
    ((12, 20), (1, 6)),     # Winter break
    ((3, 25), (4, 7)),      # Spring break
    ((6, 14), (9, 6)),      # Summer break
    # Thanksgiving week handled separately
]

SPOT_FAME = {
    "malibu": 1.0,
    "sunset_malibu": 0.70,
    "point_dume": 0.70,
    "el_porto": 0.75,
    "manhattan_pier": 0.65,
    "venice": 0.60,
    "zuma": 0.65,
    "hermosa": 0.55,
    "topanga": 0.50,
    "leo_carrillo": 0.55,
    "redondo": 0.45,
}

SPOT_IDS = sorted(SPOT_FAME.keys())
SPOT_INDEX = {s: i for i, s in enumerate(SPOT_IDS)}


def is_school_break(dt: datetime) -> bool:
    m, d = dt.month, dt.day
    for (sm, sd), (em, ed) in SCHOOL_BREAKS:
        # Handle year wrap (winter break)
        if sm > em:
            if (m == sm and d >= sd) or (m == em and d <= ed) or (m == 1 and em == 1):
                return True
        else:
            if (m > sm or (m == sm and d >= sd)) and (m < em or (m == em and d <= ed)):
                return True
    # Thanksgiving week: 4th Thursday of November + surrounding days
    if m == 11:
        thursdays = [day for day in range(1, 30) if date(dt.year, 11, day).weekday() == 3]
        thanksgiving = thursdays[3] if len(thursdays) >= 4 else thursdays[-1]
        if abs(d - thanksgiving) <= 3:
            return True
    return False


def days_to_next_holiday(dt: datetime) -> int:
    for delta in range(0, 15):
        candidate = date(dt.year, dt.month, dt.day)
        from datetime import timedelta
        candidate = candidate + timedelta(days=delta)
        if candidate in CA_HOLIDAYS:
            return delta
    return 15


def cyclic(val: float, period: float) -> tuple[float, float]:
    return math.sin(2 * math.pi * val / period), math.cos(2 * math.pi * val / period)


def build_features(
    spot_id: str,
    wvht_m: float,
    dpd_s: float,
    wind_speed_ms: float,
    wind_dir_deg: float,
    dt: datetime,
) -> list[float]:
    """Returns feature vector matching the trained model."""
    sin_h, cos_h = cyclic(dt.hour, 24)
    sin_dow, cos_dow = cyclic(dt.weekday(), 7)
    sin_mon, _ = cyclic(dt.month, 12)

    is_hol = float(date(dt.year, dt.month, dt.day) in CA_HOLIDAYS)
    is_wknd = float(dt.weekday() >= 5)
    is_sb = float(is_school_break(dt))
    dth = float(days_to_next_holiday(dt))

    # Wind: onshore for most LA spots = wind from W/SW; offshore = from E/N
    # is_offshore: wind from E quarter (45–135 deg)
    is_offshore_south_bay = float(45 <= wind_dir_deg <= 135)
    # For Malibu spots offshore = N/NE (0-135)
    is_offshore_malibu = float(wind_dir_deg <= 135 or wind_dir_deg >= 315)

    is_offshore = is_offshore_south_bay  # simplified for all spots

    wave_power = wvht_m ** 2 * dpd_s * 0.5
    fame = SPOT_FAME.get(spot_id, 0.5)
    spot_enc = float(SPOT_INDEX.get(spot_id, 5))

    return [
        sin_h, cos_h,
        sin_dow, cos_dow,
        sin_mon,
        is_hol, is_wknd, is_sb, dth,
        wvht_m, dpd_s,
        wind_speed_ms, is_offshore,
        wave_power,
        spot_enc, fame,
    ]


FEATURE_NAMES = [
    "sin_hour", "cos_hour",
    "sin_dow", "cos_dow",
    "sin_month",
    "is_holiday", "is_weekend", "is_school_break", "days_to_holiday",
    "wvht_m", "dpd_s",
    "wind_speed_ms", "is_offshore",
    "wave_power",
    "spot_encoded", "fame_score",
]
