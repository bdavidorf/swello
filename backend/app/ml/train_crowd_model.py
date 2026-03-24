"""
Generate synthetic training data and train the crowd prediction model.
Run: python -m app.ml.train_crowd_model
"""

import numpy as np
import pandas as pd
import joblib
import os
from pathlib import Path
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

from app.ml.feature_engineering import (
    build_features, FEATURE_NAMES, SPOT_FAME, SPOT_IDS,
    is_school_break, days_to_next_holiday, CA_HOLIDAYS
)
from datetime import date

MODEL_PATH = Path(__file__).parent / "models" / "crowd_rf_v1.pkl"


def generate_hour(dt: datetime, spot_id: str, rng: np.random.Generator) -> dict:
    """Generate a single synthetic training row."""
    fame = SPOT_FAME.get(spot_id, 0.5)

    # Realistic buoy values sampled from seasonal distributions
    month = dt.month
    # CA surf seasonality: bigger swells in winter (Nov-Mar)
    winter = month in (11, 12, 1, 2, 3)
    wvht_m = rng.gamma(2 if winter else 1.2, 0.6 if winter else 0.5)
    wvht_m = float(np.clip(wvht_m, 0.2, 5.0))
    dpd_s = float(np.clip(rng.normal(10 if winter else 8, 2), 5, 22))
    wind_ms = float(np.clip(rng.exponential(3.5), 0, 15))
    wind_dir = float(rng.uniform(0, 360))

    # Base crowd
    base = fame * 45

    # Weekend/holiday boost
    is_wknd = float(dt.weekday() >= 5)
    is_hol = float(date(dt.year, dt.month, dt.day) in CA_HOLIDAYS)
    is_sb = float(is_school_break(dt))

    base += is_wknd * 22
    base += is_hol * 28
    base += is_sb * 16

    # Time of day: Gaussian peak at 10:30am, tails off in evening
    hour_factor = np.exp(-0.5 * ((dt.hour - 10.5) / 2.5) ** 2) * 25
    # Morning glass-off 6-8am — dedicated surfers, low crowd
    early_bonus = np.exp(-0.5 * ((dt.hour - 7) / 1.0) ** 2) * 8

    # Night/very early: near zero
    if dt.hour < 5 or dt.hour >= 20:
        base *= 0.05
        hour_factor = 0

    base += hour_factor + early_bonus

    # Wave quality drives crowd (surfers want good waves)
    wvht_ft = wvht_m * 3.28084
    if wvht_ft < 0.5:
        wave_factor = -10  # flat = nobody out
    elif wvht_ft < 2:
        wave_factor = -3
    elif wvht_ft < 5:
        wave_factor = wvht_ft * 3   # sweet spot
    else:
        wave_factor = 15 - (wvht_ft - 5) * 1.5  # too big scares casual crowd

    base += wave_factor

    # Long period = better waves = more surfers
    base += (dpd_s - 8) * 0.8

    # Onshore wind (WSW-SW for south bay, W-NW for malibu) kills the crowd
    is_onshore = not (45 <= wind_dir <= 135)  # simplified
    if is_onshore and wind_ms > 5:
        base -= wind_ms * 2.5

    # Season: summer = more beachgoers / crowd
    if month in (6, 7, 8, 9):
        base += 8

    # El Porto is more consistent → slightly higher baseline
    if spot_id == "el_porto":
        base += 5

    score = float(np.clip(base + rng.normal(0, 8), 0, 100))

    features = build_features(spot_id, wvht_m, dpd_s, wind_ms, wind_dir, dt)
    row = dict(zip(FEATURE_NAMES, features))
    row["target_crowd"] = score
    return row


def generate_dataset(years: int = 3, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    start = datetime(2022, 1, 1, 0, 0)
    total_hours = years * 365 * 24
    rows = []

    print(f"Generating {total_hours * len(SPOT_IDS):,} synthetic samples...")
    for h in range(total_hours):
        dt = start + timedelta(hours=h)
        for spot_id in SPOT_IDS:
            rows.append(generate_hour(dt, spot_id, rng))

    return pd.DataFrame(rows)


def train(df: pd.DataFrame) -> RandomForestRegressor:
    X = df[FEATURE_NAMES].values
    y = df["target_crowd"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=20,
        n_jobs=-1,
        random_state=42,
    )
    print("Training RandomForest...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"R² = {r2:.4f}  |  MAE = {mae:.2f} crowd points")

    return model


def load_cam_data(min_readings: int = 100) -> "pd.DataFrame | None":
    """
    Load cam-based crowd counts from SQLite.
    Converts raw person_count → 0-100 crowd score using a sigmoid curve.
    Returns None if not enough data yet.
    """
    import sqlite3
    db_path = Path(__file__).parent.parent / "data" / "crowd_readings.db"
    if not db_path.exists():
        return None
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT spot_id, captured_at, person_count, wvht_ft, dpd_s,
               wind_mph, day_of_week, hour
        FROM cam_crowd_readings
        WHERE person_count IS NOT NULL
    """).fetchall()
    conn.close()

    if len(rows) < min_readings:
        print(f"[train] Only {len(rows)} cam readings — need {min_readings}+ to use cam data.")
        return None

    import pandas as pd
    from datetime import datetime

    # Spot-specific max crowd estimates (used for normalization)
    # Malibu peaks at ~100 surfers on a good day; Zuma much less
    SPOT_MAX: dict[str, int] = {
        "malibu": 90, "venice": 80, "el_porto": 100,
        "manhattan_pier": 85, "hermosa": 70, "redondo": 60,
        "zuma": 50, "leo_carrillo": 40, "topanga": 30,
        "sunset_malibu": 35, "point_dume": 45,
    }

    real_rows = []
    for spot_id, captured_at, person_count, wvht_ft, dpd_s, wind_mph, dow, hour in rows:
        try:
            dt = datetime.fromisoformat(captured_at.replace("Z", "+00:00")).replace(tzinfo=None)
            # Normalize person_count to 0-100 scale using spot's expected max
            max_people = SPOT_MAX.get(spot_id, 60)
            crowd_score = min(100.0, (person_count / max_people) * 100.0)

            wvht_m = (wvht_ft or 1.0) / 3.28084
            dpd = dpd_s or 10.0
            wind_ms = (wind_mph or 3.0) * 0.44704

            features = build_features(spot_id, wvht_m, dpd, wind_ms, 270.0, dt)
            row = dict(zip(FEATURE_NAMES, features))
            row["target_crowd"] = crowd_score
            real_rows.append(row)
        except Exception:
            continue

    print(f"[train] Loaded {len(real_rows)} cam crowd readings.")
    return pd.DataFrame(real_rows) if real_rows else None


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--use-cam-data", action="store_true",
                        help="Blend in cam-based crowd counts if available")
    args = parser.parse_args()

    if args.use_cam_data:
        synthetic = generate_dataset(years=3)
        cam = load_cam_data()
        if cam is not None:
            # Cam data weighted 10x — it's real observed behavior
            cam_heavy = pd.concat([cam] * 10, ignore_index=True)
            df = pd.concat([synthetic, cam_heavy], ignore_index=True)
            print(f"Blended: {len(synthetic)} synthetic + {len(cam_heavy)} cam (10x)")
        else:
            df = synthetic
    else:
        df = generate_dataset(years=3)

    model = train(df)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


def load_real_reports() -> "pd.DataFrame | None":
    """Load user-submitted crowd reports from SQLite. Returns None if < 30 reports."""
    import sqlite3
    from pathlib import Path
    db_path = Path(__file__).parent.parent / "data" / "crowd_readings.db"
    if not db_path.exists():
        return None
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT spot_id, reported_at, crowd_score, wvht_ft, dpd_s, wind_mph
        FROM crowd_reports
        WHERE source = 'user'
    """).fetchall()
    conn.close()
    if len(rows) < 30:
        print(f"[train] Only {len(rows)} real reports — need 30+ to blend. Using synthetic only.")
        return None

    import pandas as pd
    from datetime import datetime
    real_rows = []
    for spot_id, reported_at, crowd_score, wvht_ft, dpd_s, wind_mph in rows:
        try:
            dt = datetime.fromisoformat(reported_at.replace("Z", "+00:00")).replace(tzinfo=None)
            wvht_m = (wvht_ft or 1.0) / 3.28084
            dpd = dpd_s or 10.0
            wind_ms = (wind_mph or 3.0) * 0.44704
            features = build_features(spot_id, wvht_m, dpd, wind_ms, 270.0, dt)
            row = dict(zip(FEATURE_NAMES, features))
            row["target_crowd"] = float(crowd_score)
            real_rows.append(row)
        except Exception:
            continue

    print(f"[train] Loaded {len(real_rows)} real crowd reports.")
    return pd.DataFrame(real_rows)


def train_with_real_data():
    """Train model blending synthetic + real data. Real data weighted 5x."""
    synthetic = generate_dataset(years=3)
    real = load_real_reports()

    if real is not None and len(real) >= 30:
        # Oversample real data 5x to give it more weight
        real_oversampled = pd.concat([real] * 5, ignore_index=True)
        df = pd.concat([synthetic, real_oversampled], ignore_index=True)
        print(f"[train] Blended: {len(synthetic)} synthetic + {len(real_oversampled)} real (5x oversampled)")
    else:
        df = synthetic

    model = train(df)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    return model
