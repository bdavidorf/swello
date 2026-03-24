from __future__ import annotations
"""
Fetches a single frame from a surf cam source.

Supports:
  - YouTube live streams / videos (via yt-dlp + ffmpeg)
  - Direct image URLs (webcam snapshots, JPG feeds)
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
# Known cam sources per spot.
#
# Priority order: first working cam is used.
# type "youtube" → yt-dlp grabs one frame from the live stream
# type "image"   → direct JPEG snapshot URL
#
# HOW TO ADD MORE:
#   1. Find a YouTube live stream URL for the spot (search "[spot name] beach cam live")
#   2. Add {"type": "youtube", "url": "https://www.youtube.com/watch?v=VIDEO_ID", "label": "..."}
#   3. Or find a direct JPEG snapshot URL and use type "image"
# ---------------------------------------------------------------------------
SPOT_CAMS: dict[str, list[dict]] = {
    "malibu": [
        # Surfrider Beach — several channels run 24/7 live streams
        {"type": "youtube_search", "query": "Malibu Surfrider beach live cam surf", "label": "yt_malibu"},
    ],
    "zuma": [
        {"type": "youtube_search", "query": "Zuma Beach Malibu live cam surf", "label": "yt_zuma"},
    ],
    "venice": [
        # Venice Beach Boardwalk has well-known permanent live streams
        {"type": "youtube_search", "query": "Venice Beach live cam boardwalk", "label": "yt_venice"},
    ],
    "el_porto": [
        {"type": "youtube_search", "query": "El Porto Manhattan Beach surf live cam", "label": "yt_el_porto"},
    ],
    "manhattan_pier": [
        {"type": "youtube_search", "query": "Manhattan Beach Pier live cam surf", "label": "yt_manhattan"},
    ],
    "hermosa": [
        {"type": "youtube_search", "query": "Hermosa Beach live cam surf", "label": "yt_hermosa"},
    ],
    "redondo": [
        {"type": "youtube_search", "query": "Redondo Beach pier live cam", "label": "yt_redondo"},
    ],
    "leo_carrillo": [
        {"type": "youtube_search", "query": "Leo Carrillo State Beach live cam surf", "label": "yt_leo"},
    ],
    "point_dume": [
        {"type": "youtube_search", "query": "Point Dume Malibu beach live cam", "label": "yt_point_dume"},
    ],
    "topanga": [
        {"type": "youtube_search", "query": "Topanga Beach Malibu surf live cam", "label": "yt_topanga"},
    ],
    "sunset_malibu": [
        {"type": "youtube_search", "query": "Sunset Point Malibu surf live cam", "label": "yt_sunset"},
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
        if len(data) < 5000:
            return None
        with open(out_path, "wb") as f:
            f.write(data)
        return out_path

    elif cam["type"] == "youtube":
        return _grab_youtube_frame(cam["url"], out_path)

    elif cam["type"] == "youtube_search":
        # Search YouTube for a live stream matching the query
        query = cam["query"]
        search_url = f"ytsearch1:{query} live"
        return _grab_youtube_frame(search_url, out_path)

    return None


def _grab_youtube_frame(url_or_query: str, out_path: str) -> Optional[str]:
    """Use yt-dlp + ffmpeg to grab one frame from a YouTube stream."""
    # Step 1: get the direct stream URL via yt-dlp
    result = subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "--format", "best[height<=720]",  # don't need 4K for person counting
            "--get-url",
            url_or_query,
        ],
        capture_output=True, text=True, timeout=30,
    )
    stream_url = result.stdout.strip().split("\n")[0]
    if not stream_url or "Error" in stream_url:
        print(f"[cam_scraper] yt-dlp failed to get stream URL: {result.stderr[:200]}")
        return None

    # Step 2: grab one frame with ffmpeg
    result2 = subprocess.run(
        ["ffmpeg", "-i", stream_url, "-frames:v", "1", "-q:v", "2", out_path, "-y"],
        capture_output=True, timeout=45,
    )
    if Path(out_path).exists() and Path(out_path).stat().st_size > 5000:
        return out_path
    print(f"[cam_scraper] ffmpeg failed: {result2.stderr[-200:]}")
    return None


def cleanup_old_frames(days: int = 7):
    """Delete frames older than N days to save disk space."""
    import time
    cutoff = time.time() - days * 86400
    for f in FRAMES_DIR.glob("*.jpg"):
        if f.stat().st_mtime < cutoff:
            f.unlink()
