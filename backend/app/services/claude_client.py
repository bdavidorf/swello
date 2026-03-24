from __future__ import annotations
"""
AI surf advisor.
Priority: Gemini (Google Cloud) → Groq → Anthropic Claude → mock fallback.
"""

import json
from datetime import datetime, timezone
from app.config import get_settings
from app.models.ai import AIRankingRequest, AIRankingResponse, SpotWindow

settings = get_settings()


# ── Shared helpers ────────────────────────────────────────────────────────────

def _clean_json(raw: str) -> dict:
    raw = raw.strip()
    # Strip markdown fences
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else parts[0]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    # Find the outermost { } in case there's surrounding text
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end + 1]
    return json.loads(raw)


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


def _build_ranking_prompt(request: AIRankingRequest, forecast_data: list[dict]) -> str:
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

Respond with ONLY valid JSON — no markdown, no extra text:
{{"ranked_windows":[{{"spot_id":"...","spot_name":"...","start":"2024-01-01T07:00:00","end":"2024-01-01T10:00:00","wave_height_ft":4.5,"period_s":13.0,"crowd_score":25.0,"wind_quality":"offshore","composite_score":0.87,"why":"One sentence explanation"}}],"explanation":"2-3 sentence surfer-tone assessment","top_pick":"spot_id","top_pick_time":"Tuesday 7am"}}

Return top 5 windows. Weigh crowd heavily."""


# ── Gemini ────────────────────────────────────────────────────────────────────

def _get_gemini_model(json_mode: bool = False):
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    config = {"temperature": 0.4, "max_output_tokens": 2048}
    if json_mode:
        config["response_mime_type"] = "application/json"
    return genai.GenerativeModel(
        model_name="gemini-3-flash-preview",
        generation_config=config,
    )


async def _call_gemini_ranking(prompt: str) -> dict:
    model = _get_gemini_model(json_mode=True)
    response = await model.generate_content_async(prompt)
    return _clean_json(response.text)


async def get_chat_reply(
    messages: list[dict],
    conditions_context: str,
) -> str:
    """Conversational chat with Gemini. messages = [{role, content}, ...]"""
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)

    system = f"""You are Swello, a friendly AI surf advisor for Los Angeles beaches. You have real-time surf data.

{conditions_context}

Be conversational, knowledgeable, and use surf lingo naturally. Give specific spot recommendations based on what the user tells you about their skill level and preferences. Keep replies concise (2-4 sentences) unless the user asks for detail. Today is {datetime.now().strftime('%A, %B %d %Y')}."""

    model = genai.GenerativeModel(
        model_name="gemini-3-flash-preview",
        system_instruction=system,
        generation_config={"temperature": 0.7, "max_output_tokens": 512},
    )

    # Build chat history (all but last message)
    history = []
    for msg in messages[:-1]:
        history.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [msg["content"]],
        })

    chat = model.start_chat(history=history)
    response = await chat.send_message_async(messages[-1]["content"])
    return response.text


# ── Groq / Claude fallbacks ───────────────────────────────────────────────────

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


# ── Public interface ──────────────────────────────────────────────────────────

async def get_ai_ranking(
    request: AIRankingRequest,
    forecast_data: list[dict],
) -> AIRankingResponse:
    prompt = _build_ranking_prompt(request, forecast_data)
    errors = []

    if settings.gemini_api_key:
        try:
            return _parse_windows(await _call_gemini_ranking(prompt), "gemini-3-flash-preview")
        except Exception as e:
            errors.append(f"Gemini: {e}")

    if settings.groq_api_key:
        try:
            return _parse_windows(await _call_groq(prompt), "llama-3.3-70b (Groq)")
        except Exception as e:
            errors.append(f"Groq: {e}")

    if settings.anthropic_api_key:
        try:
            return _parse_windows(await _call_claude(prompt), "claude-sonnet-4-6")
        except Exception as e:
            errors.append(f"Claude: {e}")

    return AIRankingResponse(
        ranked_windows=[],
        explanation=f"AI unavailable. Errors: {'; '.join(errors) or 'No API keys configured.'}",
        top_pick="", top_pick_time="",
        generated_at=datetime.now(tz=timezone.utc),
        model_used="mock",
    )
