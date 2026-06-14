"""
port_sim.agents
~~~~~~~~~~~~~~~
Agent framework: 195 mock agents + 5 hero agents with real Gemini LLM calls.
All agents are wrapped with @trace_agent for observability.
"""

from __future__ import annotations

import json
import os
import random
from packages.autopsy_sdk import trace_agent
from .containers import Container

# ── Hero agents make real LLM calls; everyone else is mocked ─
HERO_AGENTS = {
    "container_047", "container_112", "container_183",
    "container_201", "container_099",
}

# Urgency → bid multiplier (higher urgency = higher bids)
_URGENCY_MULTIPLIER = {
    "LOW": 0.6,
    "NORMAL": 0.8,
    "HIGH": 1.0,
    "CRITICAL": 1.2,
}

# ── Try to initialize Gemini client ──────────────────────────
_LLM_AVAILABLE = False
_gemini_client = None

try:
    # pyrefly: ignore [missing-import]
    from google import genai
    _api_key = os.environ.get("GEMINI_API_KEY")
    if _api_key:
        _gemini_client = genai.Client(api_key=_api_key)
        _LLM_AVAILABLE = True
except (ImportError, Exception):
    pass


def _mock_decision(
    container: Container,
    available_slots: list[str],
    refrigerated_slots: list[str] | None = None,
) -> dict:
    """
    Deterministic mock for non-hero agents.
    Prefers refrigerated slots for cold chain cargo.
    Uses urgency to scale bid values.
    """
    if not available_slots:
        return {
            "action": "WAIT",
            "slot": None,
            "bid_value": 0.0,
            "chain_of_thought": "No slots available, waiting.",
        }

    urgency_mult = _URGENCY_MULTIPLIER.get(container.urgency, 0.8)

    if container.cargo_type == "cold_chain" and container.temperature_constraint:
        # Use the provided refrigerated_slots list instead of parsing crane IDs
        ref_available = []
        if refrigerated_slots:
            ref_available = [s for s in available_slots if s in refrigerated_slots]

        if ref_available:
            return {
                "action": "BID",
                "slot": ref_available[0],
                "bid_value": round(min(random.uniform(0.6, 0.9) * urgency_mult, 1.0), 2),
                "chain_of_thought": (
                    f"Cold chain cargo (temp={container.temperature_constraint}°C). "
                    f"Selected refrigerated slot {ref_available[0]}."
                ),
            }
        # No refrigerated slots available — wait for next wave
        return {
            "action": "WAIT",
            "slot": None,
            "bid_value": 0.0,
            "chain_of_thought": (
                f"Cold chain cargo but no refrigerated slots free. "
                f"Waiting for next round/wave."
            ),
        }

    # Standard / hazmat: pick a random available slot
    slot = random.choice(available_slots)
    return {
        "action": "BID",
        "slot": slot,
        "bid_value": round(min(random.uniform(0.3, 0.7) * urgency_mult, 1.0), 2),
        "chain_of_thought": (
            f"Standard {container.cargo_type} cargo (urgency={container.urgency}). "
            f"Selected slot {slot}."
        ),
    }


def _llm_decision(
    agent_id: str,
    container: Container,
    available_slots: list[str],
    round_num: int,
) -> dict:
    """Real Gemini LLM call for hero agents."""
    prompt = f"""You are container agent {agent_id} in a port logistics simulation.

Container specs:
- cargo_type: {container.cargo_type}
- temperature_constraint: {container.temperature_constraint}
- urgency: {container.urgency}
- size_teu: {container.size_teu}

Available crane slots: {available_slots}
Negotiation round: {round_num}

Respond ONLY with a JSON object:
{{"action": "BID", "slot": "<slot_id>", "bid_value": <0.0-1.0>, "chain_of_thought": "<your reasoning>"}}

Pick the best slot for your cargo type. Cold chain cargo MUST use refrigerated slots (crane_0, crane_6, crane_12, crane_18)."""

    try:
        response = _gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )
        raw = response.text.strip()
        result = json.loads(raw)
        # Validate required keys
        result.setdefault("action", "BID")
        result.setdefault("slot", available_slots[0] if available_slots else None)
        result.setdefault("bid_value", 0.5)
        result.setdefault("chain_of_thought", "LLM decision")
        return result
    except Exception as e:
        # Fall back to mock if LLM fails
        return _mock_decision(container, available_slots)


@trace_agent
def container_decide(
    agent_id: str,
    container: Container,
    available_slots: list[str],
    round_num: int = 0,
    refrigerated_slots: list[str] | None = None,
) -> dict:
    """
    Main agent decision function.
    Hero agents use Gemini; everyone else uses deterministic mock.
    The @trace_agent decorator captures everything automatically.
    """
    if not available_slots:
        return {
            "action": "WAIT",
            "slot": None,
            "bid_value": 0.0,
            "chain_of_thought": "No available slots.",
        }

    if agent_id in HERO_AGENTS and _LLM_AVAILABLE:
        return _llm_decision(agent_id, container, available_slots, round_num)

    return _mock_decision(container, available_slots, refrigerated_slots)


# Keep a pristine, undecorated reference so failure_injection.reset_injections()
# can restore clean behaviour after a scenario has been injected.
_pristine_container_decide = container_decide.__wrapped__
