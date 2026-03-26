from __future__ import annotations
"""
NOAA NDBC buoy data fetcher.
Parses the fixed-width realtime2 text format:
https://www.ndbc.noaa.gov/data/realtime2/{STATION}.txt
"""

import httpx
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional
from app.models.surf import BuoyReading
from app.config import get_settings

settings = get_settings()

# Simple in-memory cache so all 11 spots sharing buoy 46221 don't hammer NDBC
_buoy_cache: dict[str, tuple[float, Optional[BuoyReading]]] = {}
_CACHE_TTL = 90  # seconds


DIRECTION_LABELS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]


def deg_to_label(deg: float) -> str:
    idx = round(deg / 22.5) % 16
    return DIRECTION_LABELS[idx]


def parse_val(s: str) -> Optional[float]:
    if s in ("MM", "99.0", "999", "9999", "99"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


async def fetch_buoy(station_id: str) -> Optional[BuoyReading]:
    # Return cached reading if still fresh
    now = time.time()
    if station_id in _buoy_cache:
        cached_ts, cached_reading = _buoy_cache[station_id]
        if now - cached_ts < _CACHE_TTL:
            return cached_reading

    url = f"{settings.ndbc_base_url}/{station_id}.txt"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except Exception:
            # Return stale cache if available rather than None
            if station_id in _buoy_cache:
                return _buoy_cache[station_id][1]
            return None

    lines = resp.text.strip().splitlines()
    # Line 0: column headers (#YY  MM DD hh mm WDIR WSPD GST  WVHT  DPD   APD MWD  PRES ATMP WTMP ...)
    # Line 1: units
    # Line 2+: data (most recent first)

    # Line 0: column names (#YY MM DD hh mm WDIR WSPD ...)
    # Line 1: units (#yr mo dy hr mn degT m/s ...)  — skip
    # Line 2+: data rows (most recent first)
    header_line = None
    data_lines = []
    for line in lines:
        if line.startswith("#"):
            if header_line is None:          # only keep the FIRST header line
                header_line = line.lstrip("#").split()
            # skip subsequent # lines (units row)
        else:
            data_lines.append(line.split())
            if len(data_lines) >= 4:         # scan up to 4 rows to find complete data
                break

    if not data_lines or not header_line:
        return None

    # Prefer the most recent row that has both WVHT and DPD; fall back to first row
    cols_idx = {name: idx for idx, name in enumerate(header_line)}
    wvht_idx = cols_idx.get("WVHT")
    dpd_idx = cols_idx.get("DPD")

    data_line = data_lines[0]  # default: most recent
    for row in data_lines:
        wvht_ok = wvht_idx is not None and wvht_idx < len(row) and row[wvht_idx] not in ("MM", "99.0", "999", "9999")
        dpd_ok  = dpd_idx  is not None and dpd_idx  < len(row) and row[dpd_idx]  not in ("MM", "99.0", "999", "9999")
        if wvht_ok and dpd_ok:
            data_line = row
            break

    # Map column name to index
    cols = {name: idx for idx, name in enumerate(header_line)}

    def get(name: str) -> Optional[float]:
        idx = cols.get(name)
        if idx is None or idx >= len(data_line):
            return None
        return parse_val(data_line[idx])

    # Parse timestamp (YY MM DD hh mm)
    try:
        yr = int(data_line[0])
        yr = 2000 + yr if yr < 100 else yr
        month = int(data_line[1])
        day = int(data_line[2])
        hour = int(data_line[3])
        minute = int(data_line[4])
        ts = datetime(yr, month, day, hour, minute, tzinfo=timezone.utc)
    except Exception:
        ts = datetime.now(tz=timezone.utc)

    data_age = (datetime.now(tz=timezone.utc) - ts).total_seconds() / 60

    wvht = get("WVHT")
    dpd = get("DPD")
    wspd = get("WSPD")
    wdir = get("WDIR")
    mwd = get("MWD")
    wtmp = get("WTMP")

    reading = BuoyReading(
        station_id=station_id,
        timestamp=ts,
        wvht_m=wvht,
        wvht_ft=round(wvht * 3.28084, 1) if wvht else None,
        dpd_s=dpd,
        apd_s=get("APD"),
        mwd_deg=mwd,
        mwd_label=deg_to_label(mwd) if mwd else None,
        wspd_ms=wspd,
        wspd_mph=round(wspd * 2.23694, 1) if wspd else None,
        wdir_deg=wdir,
        wdir_label=deg_to_label(wdir) if wdir else None,
        wtmp_c=wtmp,
        wtmp_f=round(wtmp * 9 / 5 + 32, 1) if wtmp else None,
        atmp_c=get("ATMP"),
        pres_hpa=get("PRES"),
        data_age_minutes=round(data_age, 1),
    )
    _buoy_cache[station_id] = (time.time(), reading)
    return reading


async def fetch_buoy_with_fallback(primary: str, fallback: str) -> Optional[BuoyReading]:
    reading = await fetch_buoy(primary)
    if reading is None or reading.wvht_m is None:
        reading = await fetch_buoy(fallback)
    return reading
