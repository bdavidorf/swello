from __future__ import annotations
"""
AI surf ranking.
Priority: Groq (free) → Anthropic Claude → mock fallback.
"""

import json
from datetime import datetime, timezone
from app.config import get_settings
from app.models.ai import AIRankingRequest, AIRankingResponse, SpotWindow

settings = get_settings()


def _build_prompt(request: AIRankingRequest, forecast_data: list[dict]) -> str:
    prefs = request.preferences
    prefs_text = (
        f"Wave height: {prefs.min_wave_height_ft}–{prefs.max_wave_height_ft} ft | "
        f"Period: {prefs.preferred_period_s}s+ | "
        f"Max wind: {prefs.max_wind_speed_mph} mph | "
        f"Max crowd: {prefs.max_crowd_score}/100 | "
        f"Experience: {prefs.experience_level}"
    )
    forecast_text = json.dumps(forecast_data, indent=2, default=str)

    return f"""You are a California surf forecasting expert. Given forecast data for LA surf spots over the next {request.forecast_horizon_hours} hours, recommend the best time windows.

User preferences: {prefs_text}

FORECAST DATA:
{forecast_text}

Respond with ONLY valid JSON — no markdown fences, no extra text:
{{
  "ranked_windows": [
    {{
      "spot_id": "...",
      "spot_name": "...",
      "start": "2024-01-01T07:00:00",
      "end": "2024-01-01T10:00:00",
      "wave_height_ft": 4.5,
      "period_s": 13.0,
      "crowd_score": 25.0,
      "wind_quality": "offshore",
      "composite_score": 0.87,
      "why": "One sentence explanation"
    }}
  ],
  "explanation": "2-3 sentence friendly surfer-tone overall assessment",
  "top_pick": "spot_id",
  "top_pick_time": "Tuesday 7am"
}}

Return top 5 windows. Weigh crowd heavily — uncrowded + decent waves beats crowded + great waves."""


def _parse_windows(data: dict, model_name: str) -> AIRankingResponse:
    windows = []
    for w in data.get("ranked_windows", []):
        try:
            windows.append(SpotWindow(
                spot_id=w["spot_id"],
                spot_name=w["spot_name"],
                start=datetime.fromisoformat(w["start"]),
                end=datetime.fromisoformat(w["end"]),
                wave_height_ft=w["wave_height_ft"],
                period_s=w["period_s"],
                crowd_score=w["crowd_score"],
                wind_quality=w["wind_quality"],
                composite_score=w["composite_score"],
                why=w["why"],
            ))
        except Exception:
            continue
    return AIRankingResponse(
        ranked_windows=windows,
        explanation=data.get("explanation", ""),
        top_pick=data.get("top_pick", ""),
        top_pick_time=data.get("top_pick_time", ""),
        generated_at=datetime.now(tz=timezone.utc),
        model_used=model_name,
    )


def _clean_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


async def _call_groq(prompt: str) -> dict:
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.groq_api_key)
    resp = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.3,
    )
    return _clean_json(resp.choices[0].message.content)


async def _call_claude(prompt: str) -> dict:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return _clean_json(message.content[0].text)


async def get_ai_ranking(
    request: AIRankingRequest,
    forecast_data: list[dict],
) -> AIRankingResponse:
    prompt = _build_prompt(request, forecast_data)

    if settings.groq_api_key:
        try:
            return _parse_windows(await _call_groq(prompt), "llama-3.3-70b (Groq)")
        except Exception as e:
            err = f"Groq error: {e}"
    elif settings.anthropic_api_key:
        try:
            return _parse_windows(await _call_claude(prompt), "claude-sonnet-4-6")
        except Exception as e:
            err = f"Claude error: {e}"
    else:
        err = "No AI key configured."

    return AIRankingResponse(
        ranked_windows=[],
        explanation=f"Add a GROQ_API_KEY to your .env file (free at console.groq.com). {err}",
        top_pick="", top_pick_time="",
        generated_at=datetime.now(tz=timezone.utc),
        model_used="mock",
    )
