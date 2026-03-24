from __future__ import annotations
"""
Fetches a single frame from a surf cam source.

Supports:
  - YouTube live streams / videos (via yt-dlp)
  - Direct image URLs (webcam snapshots, JPG feeds)
  - RTSP/HLS video streams (via cv2)
"""

import os
import subprocess
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

FRAMES_DIR = Path(__file__).parent.parent / "data" / "cam_frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Known cam sources per spot
# Free / publicly accessible sources only.
# Add more as you find them — just needs to be a YouTube URL or direct image URL.
# ---------------------------------------------------------------------------
SPOT_CAMS: dict[str, list[dict]] = {
    "malibu": [
        # Surfline Malibu/Surfrider public cam snapshots (no auth required for stills)
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a77087f1.jpg",
         "label": "surfline_malibu"},
        # Backup: YouTube - various channels stream Malibu live
        {"type": "youtube", "url": "https://www.youtube.com/watch?v=live_malibu_placeholder",
         "label": "youtube_malibu", "active": False},
    ],
    "venice": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a7708823.jpg",
         "label": "surfline_venice"},
    ],
    "el_porto": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a770882b.jpg",
         "label": "surfline_el_porto"},
    ],
    "manhattan_pier": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a770882b.jpg",
         "label": "surfline_manhattan"},
    ],
    "hermosa": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a770884c.jpg",
         "label": "surfline_hermosa"},
    ],
    "zuma": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a7708700.jpg",
         "label": "surfline_zuma"},
    ],
    "redondo": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a7708862.jpg",
         "label": "surfline_redondo"},
    ],
    "leo_carrillo": [
        {"type": "image", "url": "https://camrewinds.cdn-surfline.com/cache/buoy-live-cam/5842041f4e65fad6a77086f9.jpg",
         "label": "surfline_leo_carrillo"},
    ],
}


def fetch_frame(spot_id: str) -> Optional[tuple[str, str]]:
    """
    Fetch the most recent frame for a spot.
    Returns (local_image_path, cam_label) or None on failure.
    """
    cams = SPOT_CAMS.get(spot_id, [])
    for cam in cams:
        if cam.get("active") is False:
            continue
        try:
            path = _download(cam, spot_id)
            if path:
                return path, cam["label"]
        except Exception as e:
            print(f"[cam_scraper] {cam['label']} failed: {e}")
            continue
    return None


def _download(cam: dict, spot_id: str) -> Optional[str]:
    ts = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = str(FRAMES_DIR / f"{spot_id}_{ts}.jpg")

    if cam["type"] == "image":
        req = urllib.request.Request(
            cam["url"],
            headers={"User-Agent": "Mozilla/5.0 (compatible; SurfForecastBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
        if len(data) < 5000:   # too small = error page / blank image
            return None
        with open(out_path, "wb") as f:
            f.write(data)
        return out_path

    elif cam["type"] == "youtube":
        # yt-dlp grabs one frame from the live stream without downloading full video
        result = subprocess.run(
            [
                "yt-dlp",
                "--no-playlist",
                "--skip-download",
                "--write-thumbnail",
                "--convert-thumbnails", "jpg",
                "-o", out_path.replace(".jpg", ""),
                cam["url"],
            ],
            capture_output=True, text=True, timeout=30,
        )
        # Check if file was created
        candidates = list(FRAMES_DIR.glob(f"{spot_id}_{ts}*.jpg"))
        if candidates:
            return str(candidates[0])
        # Fallback: extract actual frame using yt-dlp + ffmpeg
        result2 = subprocess.run(
            [
                "yt-dlp", "-g", "--no-playlist", cam["url"]
            ],
            capture_output=True, text=True, timeout=20,
        )
        stream_url = result2.stdout.strip().split("\n")[0]
        if stream_url:
            subprocess.run(
                ["ffmpeg", "-i", stream_url, "-frames:v", "1", "-q:v", "2", out_path, "-y"],
                capture_output=True, timeout=30,
            )
            if Path(out_path).exists() and Path(out_path).stat().st_size > 5000:
                return out_path
        return None

    return None


def cleanup_old_frames(days: int = 7):
    """Delete frames older than N days to save disk space."""
    import time
    cutoff = time.time() - days * 86400
    for f in FRAMES_DIR.glob("*.jpg"):
        if f.stat().st_mtime < cutoff:
            f.unlink()
