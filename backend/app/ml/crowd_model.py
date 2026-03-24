"""
Crowd prediction model wrapper.
Loads the trained model once at startup and exposes predict().
"""

import joblib
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional
from app.ml.feature_engineering import build_features
from app.models.crowd import CrowdPrediction, score_to_level

MODEL_PATH = Path(__file__).parent / "models" / "crowd_rf_v1.pkl"

_model = None


def load_model():
    global _model
    if MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
        print(f"[crowd_model] Loaded model from {MODEL_PATH}")
    else:
        print(f"[crowd_model] WARNING: model file not found at {MODEL_PATH}. Run train_crowd_model.py first.")


def predict_crowd(
    spot_id: str,
    wvht_m: float,
    dpd_s: float,
    wind_speed_ms: float,
    wind_dir_deg: float,
    dt: Optional[datetime] = None,
) -> CrowdPrediction:
    if dt is None:
        dt = datetime.now()

    features = build_features(spot_id, wvht_m, dpd_s, wind_speed_ms, wind_dir_deg, dt)
    X = np.array([features])

    if _model is not None:
        try:
            score = float(np.clip(_model.predict(X)[0], 0, 100))
            # Estimate confidence from tree variance
            tree_preds = np.array([tree.predict(X)[0] for tree in _model.estimators_])
            std = np.std(tree_preds)
            confidence = float(np.clip(1 - std / 30, 0.3, 0.99))
        except Exception:
            score = _fallback_score(spot_id, wvht_m, dt)
            confidence = 0.5
    else:
        score = _fallback_score(spot_id, wvht_m, dt)
        confidence = 0.4

    return CrowdPrediction(
        score=round(score, 1),
        level=score_to_level(score),
        confidence=round(confidence, 2),
    )


def _fallback_score(spot_id: str, wvht_m: float, dt: datetime) -> float:
    from app.ml.feature_engineering import SPOT_FAME
    fame = SPOT_FAME.get(spot_id, 0.5)
    is_wknd = dt.weekday() >= 5
    h = dt.hour

    # Hard daylight gate — nobody surfs in the dark
    # Ramp up between 5:30–7:00 (dawn), ramp down between 18:30–20:00 (dusk)
    if h < 5 or h >= 21:
        return 0.0
    dawn_ramp  = float(np.clip((h - 5.5) / 1.5, 0.0, 1.0))   # 0→1 over 5:30–7:00
    dusk_ramp  = float(np.clip((20.0 - h) / 1.5, 0.0, 1.0))   # 1→0 over 18:30–20:00
    daylight   = dawn_ramp * dusk_ramp

    # Gaussian peak centered on mid-morning (10:30am)
    hour_peak = np.exp(-0.5 * ((h - 10.5) / 3.0) ** 2)

    score = (fame * 38 + (18 if is_wknd else 0) + hour_peak * 22 + wvht_m * 3) * daylight
    return float(np.clip(score, 0, 100))
