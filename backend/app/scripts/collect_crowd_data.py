#!/usr/bin/env python3
"""
Crowd data collection pipeline.

Every time this runs (meant to be called every 30 minutes via cron):
  1. Fetches a cam frame for each spot
  2. Runs YOLO person detection → surfer count
  3. Pulls current buoy conditions
  4. Logs (spot, time, count, conditions) to SQLite

After enough data accumulates, run:
  python -m app.ml.train_crowd_model --use-cam-data

Usage:
  cd /Users/bendavidorf/surf-forecast/backend
  python -m app.scripts.collect_crowd_data
  python -m app.scripts.collect_crowd_data --spot malibu   # single spot
  python -m app.scripts.collect_crowd_data --status         # show dataset stats
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make sure app is importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.cam_scraper import fetch_frame, SPOT_CAMS
from app.services.person_counter import count_surfers
from app.services.ndbc import fetch_buoy_data
from app.config import get_spot_by_id

DB_PATH = Path(__file__).parent.parent / "data" / "crowd_readings.db"

# All spots that have cam sources configured
MONITORED_SPOTS = list(SPOT_CAMS.keys())

# Buoy 46221 (Santa Monica Bay) — primary for all LA spots
BUOY_ID = "46221"


def collect_one_spot(spot_id: str, save_annotated: bool = False) -> dict | None:
    """Run the full pipeline for one spot. Returns log dict or None."""
    now = datetime.now(tz=timezone.utc)

    print(f"[{spot_id}] Fetching cam frame...")
    frame_result = fetch_frame(spot_id)
    if not frame_result:
        print(f"[{spot_id}] No cam available — skip")
        return None

    image_path, cam_label = frame_result
    print(f"[{spot_id}] Frame saved: {image_path}")

    print(f"[{spot_id}] Counting surfers with YOLO...")
    count_result = count_surfers(image_path, save_annotated=save_annotated)
    print(f"[{spot_id}] Count: {count_result.person_count} people (conf={count_result.confidence})")

    print(f"[{spot_id}] Fetching buoy conditions...")
    buoy = fetch_buoy_data(BUOY_ID)
    wvht_ft = buoy.wvht_ft if buoy else None
    dpd_s   = buoy.dpd_s   if buoy else None
    wind_mph = buoy.wspd_mph if buoy else None
    wind_dir = buoy.wdir_label if buoy else None

    row = {
        "spot_id": spot_id,
        "captured_at": now.isoformat(),
        "person_count": count_result.person_count,
        "wvht_ft": wvht_ft,
        "dpd_s": dpd_s,
        "wind_mph": wind_mph,
        "wind_dir": wind_dir,
        "day_of_week": now.weekday(),
        "hour": now.hour,
        "cam_source": cam_label,
        "image_path": image_path,
    }

    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO cam_crowd_readings
        (spot_id, captured_at, person_count, wvht_ft, dpd_s, wind_mph, wind_dir,
         day_of_week, hour, cam_source, image_path)
        VALUES (:spot_id, :captured_at, :person_count, :wvht_ft, :dpd_s, :wind_mph,
                :wind_dir, :day_of_week, :hour, :cam_source, :image_path)
    """, row)
    conn.commit()
    conn.close()

    print(f"[{spot_id}] Logged to DB ✓")
    return row


def collect_all():
    results = []
    for spot_id in MONITORED_SPOTS:
        try:
            r = collect_one_spot(spot_id)
            if r:
                results.append(r)
        except Exception as e:
            print(f"[{spot_id}] ERROR: {e}")
    print(f"\nDone. {len(results)}/{len(MONITORED_SPOTS)} spots logged.")
    return results


def show_status():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT spot_id,
               COUNT(*) as total,
               MIN(captured_at) as first,
               MAX(captured_at) as last,
               ROUND(AVG(person_count), 1) as avg_count,
               MAX(person_count) as peak_count
        FROM cam_crowd_readings
        GROUP BY spot_id
        ORDER BY total DESC
    """).fetchall()
    conn.close()

    if not rows:
        print("No cam crowd data collected yet.")
        return

    print(f"\n{'Spot':<18} {'Readings':>8} {'Avg Count':>10} {'Peak':>6} {'First':>22} {'Last':>22}")
    print("-" * 90)
    for spot_id, total, first, last, avg_c, peak in rows:
        print(f"{spot_id:<18} {total:>8} {avg_c:>10} {peak:>6} {first[:19]:>22} {last[:19]:>22}")

    total_all = sum(r[1] for r in rows)
    print(f"\nTotal readings: {total_all}")
    if total_all >= 200:
        print("✓ Enough data to train a real crowd model. Run: python -m app.ml.train_crowd_model --use-cam-data")
    else:
        print(f"Need ~{200 - total_all} more readings before retraining (running every 30min = {(200 - total_all) // 2}h)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--spot", help="Collect for one spot only")
    parser.add_argument("--status", action="store_true", help="Show dataset stats")
    parser.add_argument("--annotate", action="store_true", help="Save annotated images")
    args = parser.parse_args()

    if args.status:
        show_status()
    elif args.spot:
        collect_one_spot(args.spot, save_annotated=args.annotate)
    else:
        collect_all()
