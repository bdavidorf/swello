from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from app.models.ai import AIRankingRequest, AIRankingResponse
from app.config import get_spots, get_spot_by_id
from app.services.nws import fetch_hourly_forecast
from app.services.ndbc import fetch_buoy_with_fallback, deg_to_label
from app.services.wave_power import wind_quality_for_spot, CARDINAL_TO_DEG
from app.services.openmeteo import fetch_current_wind
from app.ml.crowd_model import predict_crowd
from app.services.claude_client import get_ai_ranking, get_chat_reply, get_spot_analysis
import asyncio

router = APIRouter(prefix="/ai", tags=["ai"])


# ── Shared forecast builder ───────────────────────────────────────────────────

async def _build_spot_forecast_summary(spot: dict, hours: int = 48) -> dict:
    """Compact forecast for feeding to AI (keep token count reasonable)."""
    try:
        nws = await fetch_hourly_forecast(spot["lat"], spot["lon"])
        buoy = await fetch_buoy_with_fallback(spot["buoy_primary"], spot.get("buoy_fallback"))
    except Exception:
        return {}

    windows = []
    for pt in (nws or [])[:hours:3]:  # every 3 hours to save tokens
        wind_deg = CARDINAL_TO_DEG.get(pt.wind_dir.upper(), 270)
        wind = wind_quality_for_spot(
            pt.wind_dir, pt.wind_speed_mph,
            spot["offshore_wind_dir_min"], spot["offshore_wind_dir_max"],
        )
        wvht_m = max(0.3, (buoy.wvht_m or 1.0))
        dpd_s = buoy.dpd_s or 10.0
        crowd = predict_crowd(
            spot_id=spot["id"],
            wvht_m=wvht_m,
            dpd_s=dpd_s,
            wind_speed_ms=pt.wind_speed_mph * 0.44704,
            wind_dir_deg=wind_deg,
            dt=pt.timestamp.replace(tzinfo=None),
        )
        windows.append({
            "time": pt.timestamp.strftime("%a %b %d %I%p"),
            "wave_ft": round(wvht_m * 3.28084, 1),
            "period_s": dpd_s,
            "wind_mph": pt.wind_speed_mph,
            "wind_dir": pt.wind_dir,
            "wind_quality": wind.quality,
            "crowd": round(crowd.score),
            "crowd_level": crowd.level,
        })

    return {
        "spot_id": spot["id"],
        "spot_name": spot["name"],
        "break_type": spot["break_type"],
        "difficulty": spot["difficulty"],
        "facing": spot["facing_dir"],
        "windows": windows,
    }


async def _build_conditions_context(spot_id: str = "malibu") -> str:
    """
    Conditions context for the chat system prompt.
    Fetches live buoy + wind for the selected spot only (fast, 2 concurrent calls).
    All 115 US spots included as static metadata — no serial NWS loop.
    """
    spots = get_spots()
    selected = get_spot_by_id(spot_id) if spot_id and spot_id not in ("pin", "") else None

    lines = [f"Swello — US surf forecast as of {datetime.now().strftime('%A %B %d, %I:%M %p')}:\n"]

    # Live data for currently selected spot only
    if selected:
        try:
            buoy, (wind_mph, wind_deg) = await asyncio.gather(
                fetch_buoy_with_fallback(selected["buoy_primary"], selected.get("buoy_fallback")),
                fetch_current_wind(selected["lat"], selected["lon"]),
            )
            if buoy and buoy.wvht_ft:
                wind_str = ""
                if wind_mph is not None and wind_deg is not None:
                    wq = wind_quality_for_spot(
                        deg_to_label(wind_deg), wind_mph,
                        selected["offshore_wind_dir_min"], selected["offshore_wind_dir_max"],
                    )
                    wind_str = f", wind {wind_mph:.0f}mph {wq.quality_label}"
                lines.append(
                    f"USER IS CURRENTLY VIEWING: {selected['name']} ({selected.get('region','')})\n"
                    f"Live conditions — {buoy.wvht_ft:.1f}ft @ {(buoy.dpd_s or 0):.0f}s, "
                    f"{buoy.mwd_label or '--'} swell{wind_str}, water {(buoy.wtmp_f or 0):.0f}°F\n"
                    f"Break: {selected['break_type']}, {selected['difficulty']}, "
                    f"faces {selected['facing_dir']}, ideal swell {selected.get('ideal_swell_dir_label','--')}\n"
                )
        except Exception:
            pass

    # Static directory — all 115 spots grouped by region (no API calls)
    lines.append(f"All {len(spots)} US surf spots in the database:")
    regions: dict[str, list] = {}
    for s in spots:
        regions.setdefault(s.get("region", "Other"), []).append(s)
    for region in sorted(regions):
        lines.append(f"\n{region}:")
        for s in regions[region]:
            marker = " ← CURRENTLY VIEWING" if s["id"] == spot_id else ""
            lines.append(
                f"  {s['name']}: {s['break_type']}, {s['difficulty']}, "
                f"faces {s['facing_dir']}, ideal {s.get('ideal_swell_dir_label','--')}{marker}"
            )

    lines.append(
        "\nYou are Swello, a knowledgeable US surf forecaster covering all 115 spots "
        "from Hawaii to Puerto Rico, California to New England. "
        "Help users find the best sessions, understand conditions, and discover spots suited to their skill level and board."
    )
    return "\n".join(lines)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/rank-spots", response_model=AIRankingResponse)
async def rank_spots(request: AIRankingRequest):
    all_spots = get_spots()
    if request.spots:
        all_spots = [s for s in all_spots if s["id"] in request.spots]

    tasks = [_build_spot_forecast_summary(s, request.forecast_horizon_hours) for s in all_spots]
    summaries = await asyncio.gather(*tasks)
    forecast_data = [s for s in summaries if s]

    return await get_ai_ranking(request, forecast_data)


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    spot_id: str = "malibu"

class ChatResponse(BaseModel):
    reply: str
    model_used: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(400, "No messages provided")

    context = await _build_conditions_context(request.spot_id)
    msgs = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        reply, model_used = await get_chat_reply(msgs, context)
        return ChatResponse(reply=reply, model_used=model_used)
    except Exception as e:
        raise HTTPException(503, f"AI unavailable: {e}")


class SpotAnalysisRequest(BaseModel):
    condition: dict  # full SurfCondition JSON from frontend
    spot_meta: dict = {}  # break_type, difficulty, facing_dir

class SpotAnalysisResponse(BaseModel):
    analysis: str
    spot_id: str


@router.post("/spot-analysis", response_model=SpotAnalysisResponse)
async def spot_analysis(request: SpotAnalysisRequest):
    """Generate a Gemini-written session briefing using all live condition data."""
    condition = request.condition
    # Inject spot meta fields so prompt can use them
    condition["_break_type"] = request.spot_meta.get("break_type", "--")
    condition["_difficulty"]  = request.spot_meta.get("difficulty", "--")
    condition["_facing"]      = request.spot_meta.get("facing_dir", "--")

    try:
        analysis = await get_spot_analysis(condition)
        return SpotAnalysisResponse(
            analysis=analysis,
            spot_id=condition.get("spot_id", ""),
        )
    except Exception as e:
        raise HTTPException(503, f"Analysis unavailable: {e}")
