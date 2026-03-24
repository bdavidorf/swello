from __future__ import annotations
"""
Sunrise, sunset, first light (dawn), and last light (dusk) for a given location and date.

Dawn/dusk = civil twilight: sun is 6° below horizon.
Surfers use this for dawn patrol planning — there's enough light to paddle out
about 20-30 min before official sunrise.
"""

from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo
from astral import LocationInfo
from astral.sun import sun, golden_hour

LA_TZ = ZoneInfo("America/Los_Angeles")


def get_sun_times(lat: float, lon: float, for_date: date | None = None) -> dict:
    """
    Returns all sun times for the given location and date (local time).
    Includes dawn patrol window (first light to 1hr after sunrise).
    """
    if for_date is None:
        for_date = datetime.now(LA_TZ).date()

    location = LocationInfo(
        name="spot",
        region="CA",
        timezone="America/Los_Angeles",
        latitude=lat,
        longitude=lon,
    )

    try:
        s = sun(location.observer, date=for_date, tzinfo=LA_TZ)
    except Exception:
        return {}

    try:
        gh = golden_hour(location.observer, date=for_date, tzinfo=LA_TZ)
        golden_start = gh[0].isoformat()
        golden_end = gh[1].isoformat()
    except Exception:
        golden_start = None
        golden_end = None

    dawn = s["dawn"]
    sunrise = s["sunrise"]
    solar_noon = s["noon"]
    sunset = s["sunset"]
    dusk = s["dusk"]

    # Dawn patrol window: first light → 90 min after sunrise
    from datetime import timedelta
    dawn_patrol_end = sunrise + timedelta(minutes=90)

    now_local = datetime.now(LA_TZ)
    mins_to_sunrise = (sunrise - now_local).total_seconds() / 60
    mins_to_sunset = (sunset - now_local).total_seconds() / 60

    def _fmt(dt: datetime) -> str:
        return dt.strftime("%-I:%M %p")

    return {
        "date": for_date.isoformat(),
        "first_light": dawn.isoformat(),
        "first_light_display": _fmt(dawn),
        "sunrise": sunrise.isoformat(),
        "sunrise_display": _fmt(sunrise),
        "solar_noon": solar_noon.isoformat(),
        "solar_noon_display": _fmt(solar_noon),
        "sunset": sunset.isoformat(),
        "sunset_display": _fmt(sunset),
        "last_light": dusk.isoformat(),
        "last_light_display": _fmt(dusk),
        "golden_hour_morning_start": golden_start,
        "golden_hour_evening_end": golden_end,
        "dawn_patrol_window": {
            "start": dawn.isoformat(),
            "start_display": _fmt(dawn),
            "end": dawn_patrol_end.isoformat(),
            "end_display": _fmt(dawn_patrol_end),
        },
        "daylight_hours": round((sunset - sunrise).total_seconds() / 3600, 1),
        "minutes_to_sunrise": round(mins_to_sunrise),
        "minutes_to_sunset": round(mins_to_sunset),
        "is_daytime": sunrise <= now_local <= sunset,
        "is_dawn_patrol_window": dawn <= now_local <= dawn_patrol_end,
        "is_golden_hour_morning": dawn <= now_local <= sunrise,
    }
