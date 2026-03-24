# Swello — AI Surf Forecast

## Quick Start

### 1. Backend (Terminal 1)
```bash
cd /Users/bendavidorf/surf-forecast/backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (optional — app works without it)
uvicorn app.main:app --port 8001 --reload
```

### 2. Frontend (Terminal 2)
```bash
cd /Users/bendavidorf/surf-forecast/frontend
npm run dev
```

Open: http://localhost:5173

---

## If you need to retrain the crowd model:
```bash
cd /Users/bendavidorf/surf-forecast/backend
python -m app.ml.train_crowd_model
```
Current model: R² = 0.93, MAE = 6.1 crowd points

---

## API Docs
http://localhost:8001/docs  (Swagger UI)

---

## Key Endpoints
- `GET /api/v1/conditions` — all 11 LA spots at once
- `GET /api/v1/conditions/{spot_id}` — single spot (buoy + wind + crowd)
- `GET /api/v1/forecast/{spot_id}` — 7-day hourly forecast
- `GET /api/v1/tides/{spot_id}` — tide predictions
- `GET /api/v1/crowd/{spot_id}/today` — hourly crowd prediction for today
- `POST /api/v1/ai/rank-spots` — Claude AI recommendations
- `GET /api/v1/health` — server status

## Spot IDs
malibu, zuma, leo_carrillo, topanga, sunset_malibu,
venice, el_porto, manhattan_pier, hermosa, redondo, point_dume
