from __future__ import annotations
"""
Surfline API client.
Handles login (JWT), live cam snapshots, and cam rewind (historical frames).

Surfline stores cam rewind frames at 10-minute intervals going back ~30 days.
This gives us a ready-made dataset of thousands of labeled frames when combined
with simultaneous buoy readings from NOAA.
"""

import os
import time
import json
import hashlib
import requests
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

FRAMES_DIR = Path(__file__).parent.parent / "data" / "cam_frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

AUTH_CACHE = Path(__file__).parent.parent / "data" / ".surfline_token.json"

# Surfline spot/cam IDs for our LA spots
# spotId maps to the main Surfline forecast spot
# camId is the specific camera (some spots have multiple)
SURFLINE_SPOTS: dict[str, dict] = {
    "malibu":         {"spot_id": "5842041f4e65fad6a77087f1", "cam_id": "5834a663b315cf6e1048a60c", "name": "Malibu / Surfrider"},
    "zuma":           {"spot_id": "5842041f4e65fad6a7708700", "cam_id": "5834a663b315cf6e1048a5cc", "name": "Zuma Beach"},
    "leo_carrillo":   {"spot_id": "5842041f4e65fad6a77086f9", "cam_id": "5834a663b315cf6e1048a5c9", "name": "Leo Carrillo"},
    "venice":         {"spot_id": "5842041f4e65fad6a7708823", "cam_id": "5834a663b315cf6e1048a645", "name": "Venice Beach"},
    "el_porto":       {"spot_id": "5842041f4e65fad6a770882b", "cam_id": "5834a663b315cf6e1048a64d", "name": "El Porto"},
    "manhattan_pier": {"spot_id": "5842041f4e65fad6a770882b", "cam_id": "5834a663b315cf6e1048a64d", "name": "Manhattan Beach"},
    "hermosa":        {"spot_id": "5842041f4e65fad6a770884c", "cam_id": "5834a663b315cf6e1048a65e", "name": "Hermosa Beach"},
    "redondo":        {"spot_id": "5842041f4e65fad6a7708862", "cam_id": "5834a663b315cf6e1048a66a", "name": "Redondo Beach"},
    "topanga":        {"spot_id": "5842041f4e65fad6a77086fb", "cam_id": "5834a663b315cf6e1048a5cb", "name": "Topanga"},
    "point_dume":     {"spot_id": "5842041f4e65fad6a7708700", "cam_id": "5834a663b315cf6e1048a5cc", "name": "Point Dume"},
}

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Origin": "https://www.surfline.com",
    "Referer": "https://www.surfline.com/",
})


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def login(email: str, password: str) -> Optional[str]:
    """Login to Surfline. Returns JWT token or None."""
    try:
        resp = SESSION.post(
            "https://services.surfline.com/login",
            json={"email": email, "password": password, "remember_me": True},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token") or data.get("access_token") or data.get("authorizationToken")
        if token:
            AUTH_CACHE.write_text(json.dumps({"token": token, "expires": time.time() + 3600 * 23}))
            print("[surfline] Login successful")
            return token
        print(f"[surfline] Login response missing token: {list(data.keys())}")
        return None
    except Exception as e:
        print(f"[surfline] Login failed: {e}")
        return None


def get_token(email: str = "", password: str = "") -> Optional[str]:
    """Get a valid token — uses cache if not expired, otherwise logs in."""
    if AUTH_CACHE.exists():
        cached = json.loads(AUTH_CACHE.read_text())
        if cached.get("expires", 0) > time.time() + 300:
            return cached["token"]
    if email and password:
        return login(email, password)
    return None


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Live cam snapshot
# ---------------------------------------------------------------------------

def fetch_live_frame(spot_id: str, token: str) -> Optional[str]:
    """
    Fetch the current live cam frame for a spot.
    Returns local file path or None.
    """
    spot = SURFLINE_SPOTS.get(spot_id)
    if not spot:
        return None

    cam_id = spot["cam_id"]
    ts = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = str(FRAMES_DIR / f"{spot_id}_{ts}_live.jpg")

    # Try cam still endpoint
    for url in [
        f"https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/{cam_id}.jpg",
        f"https://camrewinds.cdn-surfline.com/live-cams/{cam_id}/latest.jpg",
    ]:
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": SESSION.headers["User-Agent"],
                "Authorization": f"Bearer {token}",
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            if len(data) > 5000:
                with open(out_path, "wb") as f:
                    f.write(data)
                return out_path
        except Exception:
            continue

    return None


# ---------------------------------------------------------------------------
# Cam rewind (historical frames)
# ---------------------------------------------------------------------------

def fetch_rewind_frame(
    spot_id: str,
    token: str,
    dt: datetime,
) -> Optional[str]:
    """
    Fetch a historical cam frame for a specific datetime (UTC).
    Surfline stores frames at ~10-minute intervals going back ~30 days.
    Returns local file path or None.
    """
    spot = SURFLINE_SPOTS.get(spot_id)
    if not spot:
        return None

    cam_id = spot["cam_id"]
    date_str = dt.strftime("%Y-%m-%d")
    # Round to nearest 10 minutes
    minute = (dt.minute // 10) * 10
    time_str = dt.strftime(f"%H-{minute:02d}")
    ts_label = dt.strftime("%Y%m%d_%H%M")
    out_path = str(FRAMES_DIR / f"{spot_id}_{ts_label}_rewind.jpg")

    if Path(out_path).exists():
        return out_path  # already downloaded

    # Surfline rewind URL format (reverse-engineered from browser network tab)
    urls = [
        f"https://camrewinds.cdn-surfline.com/live-cams/{cam_id}/{date_str}/{time_str}.jpg",
        f"https://camrewinds.cdn-surfline.com/live-cams/{cam_id}/{date_str}/{dt.strftime('%H-%M')}.jpg",
        f"https://camrewinds.cdn-surfline.com/clips/{cam_id}/{date_str}/{time_str}-still.jpg",
    ]

    for url in urls:
        try:
            resp = SESSION.get(
                url,
                headers=_auth_header(token),
                timeout=10,
                stream=True,
            )
            if resp.status_code == 200 and int(resp.headers.get("Content-Length", 0) or 0) > 5000:
                with open(out_path, "wb") as f:
                    for chunk in resp.iter_content(8192):
                        f.write(chunk)
                return out_path
            # try without checking content-length
            if resp.status_code == 200 and len(resp.content) > 5000:
                with open(out_path, "wb") as f:
                    f.write(resp.content)
                return out_path
        except Exception:
            continue

    return None


def get_rewind_timestamps(days_back: int = 30) -> list[datetime]:
    """
    Returns a list of datetimes to fetch rewind frames for.
    Every 30 minutes during surf hours (6am–7pm PT), going back N days.
    """
    from zoneinfo import ZoneInfo
    LA_TZ = ZoneInfo("America/Los_Angeles")
    now = datetime.now(tz=LA_TZ)
    timestamps = []

    for d in range(1, days_back + 1):
        day = now - timedelta(days=d)
        for hour in range(6, 20):
            for minute in (0, 30):
                dt = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
                timestamps.append(dt.astimezone(timezone.utc))

    return timestamps
