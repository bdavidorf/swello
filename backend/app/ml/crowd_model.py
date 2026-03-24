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
    hour_peak = np.exp(-0.5 * ((dt.hour - 10.5) / 2.5) ** 2)
    score = fame * 40 + (20 if is_wknd else 0) + hour_peak * 20 + wvht_m * 3
    return float(np.clip(score, 0, 100))
