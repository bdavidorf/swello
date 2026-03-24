from __future__ import annotations
"""
Fetches real crowd patterns from Google Popular Times via the populartimes library.
Requires a Google Places API key — set GOOGLE_PLACES_API_KEY in .env.

Also stores + retrieves crowd patterns from the local SQLite database.
"""

import sqlite3
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "crowd_readings.db"

# Google Place IDs for each LA surf spot (found via Places Text Search)
SPOT_PLACE_IDS: dict[str, str] = {
    "malibu":         "ChIJWX3-cUau94ARLNGKdpkOHDY",   # Surfrider Beach
    "zuma":           "ChIJdaeJiGGv94ARnW9ZdYPDjrs",   # Zuma Beach
    "leo_carrillo":   "ChIJOfkWrfSs94AR5YUZP-oBa_0",   # Leo Carrillo State Beach
    "topanga":        "ChIJb7SFTXmu94ARkN6-6djTQYw",   # Topanga State Beach
    "sunset_malibu":  "ChIJWX3-cUau94ARLNGKdpkOHDY",   # use Malibu as proxy
    "venice":         "ChIJX4vvqXy1woARMOijMijApLc",   # Venice Beach
    "el_porto":       "ChIJhTFTRtm3woARlBpJEFSBJSY",   # El Porto / Manhattan Beach
    "manhattan_pier": "ChIJhTFTRtm3woARlBpJEFSBJSY",   # Manhattan Beach
    "hermosa":        "ChIJp9fmWEu4woARt0nPF_3mmMA",   # Hermosa Beach
    "redondo":        "ChIJj5KFJ_C4woARa_4HDCG3qeM",   # Redondo Beach
    "point_dume":     "ChIJXdv9Nlqv94ARgJkc3LKA9vg",   # Point Dume
}


def fetch_popular_times_for_spot(api_key: str, spot_id: str) -> bool:
    """
    Fetch Google Popular Times for one spot and store in DB.
    Returns True on success.
    """
    try:
        import populartimes
        place_id = SPOT_PLACE_IDS.get(spot_id)
        if not place_id:
            return False

        result = populartimes.get_popular_times_by_place_id(api_key, place_id)
        if not result or "popular_times" not in result:
            return False

        conn = sqlite3.connect(DB_PATH)
        now = datetime.now(tz=timezone.utc).isoformat()

        for day_data in result["popular_times"]:
            # day_data: {"name": "Monday", "data": [0, 0, ..., 45, 60, ...]}
            day_name = day_data.get("name", "")
            day_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
                       "Friday": 4, "Saturday": 5, "Sunday": 6}
            dow = day_map.get(day_name)
            if dow is None:
                continue
            for hour, popularity in enumerate(day_data.get("data", [])):
                conn.execute("""
                    INSERT OR REPLACE INTO popular_times
                    (spot_id, day_of_week, hour, avg_popularity, fetched_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (spot_id, dow, hour, int(popularity), now))

        conn.commit()
        conn.close()
        print(f"[popular_times] Stored data for {spot_id}")
        return True

    except Exception as e:
        print(f"[popular_times] Failed for {spot_id}: {e}")
        return False


def fetch_all_spots(api_key: str) -> dict[str, bool]:
    """Fetch popular times for all spots. Returns {spot_id: success}."""
    return {sid: fetch_popular_times_for_spot(api_key, sid) for sid in SPOT_PLACE_IDS}


def get_popular_times_for_spot(spot_id: str) -> Optional[list[list[int]]]:
    """
    Returns 7×24 matrix of avg_popularity or None if no data.
    Index: [day_of_week][hour] where 0=Monday, 6=Sunday.
    """
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT day_of_week, hour, avg_popularity
        FROM popular_times
        WHERE spot_id = ?
        ORDER BY day_of_week, hour
    """, (spot_id,)).fetchall()
    conn.close()

    if not rows:
        return None

    matrix = [[0] * 24 for _ in range(7)]
    for dow, hour, pop in rows:
        if 0 <= dow <= 6 and 0 <= hour <= 23:
            matrix[dow][hour] = pop
    return matrix


def get_popularity_at(spot_id: str, dt: datetime) -> Optional[int]:
    """Returns expected popularity (0-100) for this spot at this datetime, or None."""
    dow = dt.weekday()
    hour = dt.hour
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("""
        SELECT avg_popularity FROM popular_times
        WHERE spot_id = ? AND day_of_week = ? AND hour = ?
    """, (spot_id, dow, hour)).fetchone()
    conn.close()
    return row[0] if row else None


def log_crowd_report(
    spot_id: str,
    crowd_level: str,
    crowd_score: int,
    wvht_ft: Optional[float] = None,
    dpd_s: Optional[float] = None,
    wind_mph: Optional[float] = None,
    wind_dir: Optional[str] = None,
    source: str = "user",
) -> int:
    """Insert a crowd report. Returns the new row id."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("""
        INSERT INTO crowd_reports
        (spot_id, reported_at, crowd_level, crowd_score, wvht_ft, dpd_s, wind_mph, wind_dir, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        spot_id,
        datetime.now(tz=timezone.utc).isoformat(),
        crowd_level,
        crowd_score,
        wvht_ft,
        dpd_s,
        wind_mph,
        wind_dir,
        source,
    ))
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_recent_reports(spot_id: str, limit: int = 50) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT spot_id, reported_at, crowd_level, crowd_score,
               wvht_ft, dpd_s, wind_mph, wind_dir, source
        FROM crowd_reports
        WHERE spot_id = ?
        ORDER BY reported_at DESC
        LIMIT ?
    """, (spot_id, limit)).fetchall()
    conn.close()
    keys = ["spot_id", "reported_at", "crowd_level", "crowd_score",
            "wvht_ft", "dpd_s", "wind_mph", "wind_dir", "source"]
    return [dict(zip(keys, r)) for r in rows]


def get_report_count() -> dict[str, int]:
    """Returns total number of real reports per spot."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT spot_id, COUNT(*) FROM crowd_reports
        WHERE source = 'user'
        GROUP BY spot_id
    """).fetchall()
    conn.close()
    return dict(rows)
