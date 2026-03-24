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


# ── Spot analysis ────────────────────────────────────────────────────────────

def _build_analysis_prompt(c: dict) -> str:
    buoy     = c.get("buoy", {})
    breaking = c.get("breaking") or {}
    wind     = c.get("wind") or {}
    crowd    = c.get("crowd") or {}
    tide     = c.get("next_tide") or {}
    sun      = c.get("sun") or {}
    wp       = c.get("wave_power") or {}

    fmtFt = lambda n: f"{n:.1f}" if n and n < 4 else (f"{n:.0f}" if n else "--")
    face_lo = breaking.get("face_height_min_ft", 0)
    face_hi = breaking.get("face_height_max_ft", 0)
    face_str = fmtFt(face_lo) if round(face_lo, 1) == round(face_hi, 1) else f"{fmtFt(face_lo)}–{fmtFt(face_hi)}"

    tide_info = "--"
    if tide:
        evt  = tide.get("event_type", "")
        hrs  = tide.get("hours_away")
        ht   = tide.get("height_ft")
        hrs_str = f"in {hrs:.1f}h" if hrs is not None else ""
        tide_info = f"{evt} tide {hrs_str} at {ht:.1f}ft" if ht else "--"

    sun_info = []
    if sun.get("is_dawn_patrol_window"):  sun_info.append("Dawn patrol window NOW")
    if sun.get("is_golden_hour_morning"): sun_info.append("Golden hour lighting")
    if not sun.get("is_daytime"):         sun_info.append("Dark / after sunset")
    sun_str = " · ".join(sun_info) if sun_info else f"Sunrise {sun.get('sunrise_display','--')}, Sunset {sun.get('sunset_display','--')}"

    peak_crowd = f", peak hour {crowd.get('peak_hour_today')}:00" if crowd.get("peak_hour_today") else ""

    return f"""You are an expert LA surf forecaster writing a real-time session briefing for a surfer checking the app right now. Be specific, honest, and use natural surf lingo. Write 4-5 punchy sentences — no fluff.

SPOT: {c.get('spot_name')}
Break: {c.get('_break_type','--')} | Difficulty: {c.get('_difficulty','--')} | Faces: {c.get('_facing','--')}

LIVE CONDITIONS:
- Wave face: {face_str}ft ({breaking.get('face_height_label','--')})
- Buoy: {buoy.get('wvht_ft') and f"{buoy['wvht_ft']:.1f}" or '--'}ft Hs open-ocean @ {buoy.get('dpd_s') and f"{buoy['dpd_s']:.0f}" or '--'}s ({breaking.get('period_quality','--')} period, {breaking.get('swell_type_short','--')})
- Swell direction: {buoy.get('mwd_label','--')} ({buoy.get('mwd_deg') and f"{buoy['mwd_deg']:.0f}°" or '--'}) — {breaking.get('direction_rating','--')}, {breaking.get('direction_pct') and f"{breaking['direction_pct']*100:.0f}" or '--'}% reaching shore
- Wind: {wind.get('speed_mph') and f"{wind['speed_mph']:.0f}" or '--'} mph {wind.get('direction_label','--')} — {wind.get('quality_label','--')}
- Water temp: {buoy.get('wtmp_f') and f"{buoy['wtmp_f']:.0f}°F" or '--'}
- Tide: {tide_info}
- Crowd: {crowd.get('level','--')} ({crowd.get('score') and f"{crowd['score']:.0f}" or '--'}/100{peak_crowd})
- Wave power: {wp.get('kw_per_meter') and f"{wp['kw_per_meter']:.1f}" or '--'} kW/m ({wp.get('classification','--')})
- Overall surf rating: {wp.get('surf_rating','--')}/10
- Sun: {sun_str}

Write the session briefing now. Cover: wave quality and shape, how the wind is affecting it, tide situation, crowd reality check, and one clear verdict — go now, wait, or skip. Do NOT use bullet points."""


async def get_spot_analysis(condition: dict) -> str:
    """Generate a Gemini surf session briefing for a spot using all live data."""
    prompt = _build_analysis_prompt(condition)

    if settings.gemini_api_key:
        try:
            model = _get_gemini_model(json_mode=False)
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            pass  # fall through to fallback

    # Fallback: use rule-based interpretation already in the data
    breaking = condition.get("breaking") or {}
    return breaking.get("interpretation") or "Analysis unavailable — no AI key configured."


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
