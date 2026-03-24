from __future__ import annotations
"""
Uses YOLOv8 to count people in a surf cam image.
Focuses on the water zone to avoid counting beachgoers on sand.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

_model = None

def _get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO("yolov8n.pt")  # nano — fast, small download (~6MB)
    return _model


@dataclass
class CountResult:
    person_count: int
    confidence: float        # avg confidence of detections
    water_zone_pct: float    # fraction of image used as water zone
    annotated_path: Optional[str] = None


def count_surfers(
    image_path: str,
    water_zone_top_pct: float = 0.25,   # ignore top 25% (sky/cliffs)
    water_zone_bottom_pct: float = 0.85, # ignore bottom 15% (dry sand)
    min_confidence: float = 0.35,
    save_annotated: bool = False,
) -> CountResult:
    """
    Count people visible in a surf cam frame.

    water_zone_top_pct / water_zone_bottom_pct: vertical crop to focus on
    the lineup and water — avoids counting spectators on the beach.
    """
    model = _get_model()
    img = cv2.imread(image_path)
    if img is None:
        return CountResult(person_count=0, confidence=0.0, water_zone_pct=0.0)

    h, w = img.shape[:2]
    y_top    = int(h * water_zone_top_pct)
    y_bottom = int(h * water_zone_bottom_pct)
    crop = img[y_top:y_bottom, :]

    results = model(crop, classes=[0], verbose=False)  # class 0 = person
    boxes = results[0].boxes

    persons = [b for b in boxes if float(b.conf) >= min_confidence]
    count = len(persons)
    avg_conf = float(np.mean([float(b.conf) for b in persons])) if persons else 0.0
    zone_pct = (y_bottom - y_top) / h

    annotated_path = None
    if save_annotated and persons:
        out_path = image_path.replace(".jpg", "_annotated.jpg")
        annotated = results[0].plot()
        # paste annotated crop back onto full image
        full = img.copy()
        full[y_top:y_bottom, :] = annotated
        cv2.imwrite(out_path, full)
        annotated_path = out_path

    return CountResult(
        person_count=count,
        confidence=round(avg_conf, 3),
        water_zone_pct=round(zone_pct, 2),
        annotated_path=annotated_path,
    )
