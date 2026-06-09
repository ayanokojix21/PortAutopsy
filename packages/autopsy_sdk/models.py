"""
autopsy_sdk.models
~~~~~~~~~~~~~~~~~~
Single source of truth for every data shape in AgentAutopsy.
All other packages import from here — never define ad-hoc dicts.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone
from enum import Enum


# ── Enums ────────────────────────────────────────────────────

class EventStatus(str, Enum):
    """Outcome of a traced agent call."""
    SUCCESS = "success"
    ERROR = "error"


# ── Trace-Level Models ───────────────────────────────────────

class DownstreamEffect(BaseModel):
    """
    A structured causal link emitted by an agent decision.
    Using typed objects (not strings) prevents the substring-matching
    bugs that plague naive causal graph builders.
    """
    target_agent: str = Field(description="agent_id of the affected agent")
    effect_type: str = Field(description="e.g. constraint_dropped, slot_blocked, urgency_override")
    variable: Optional[str] = Field(default=None, description="Which variable was affected")
    detail: Optional[str] = Field(default=None, description="Human-readable explanation")


class TraceEvent(BaseModel):
    """
    Every agent decision produces exactly one TraceEvent.
    The @trace_agent decorator creates these automatically.
    """
    trace_id: str
    agent_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    round: int = 0
    inputs: dict[str, Any] = Field(default_factory=dict)
    chain_of_thought: Optional[str] = None
    output: dict[str, Any] = Field(default_factory=dict)
    downstream_effects: list[DownstreamEffect] = Field(default_factory=list)
    status: EventStatus = EventStatus.SUCCESS
    error_message: Optional[str] = None
    duration_ms: Optional[float] = None


# ── Report Models ────────────────────────────────────────────

class AutopsyReport(BaseModel):
    """
    The final output of the autopsy pipeline.
    This exact Pydantic class is passed to Gemini's response_schema
    and used to generate Groq's json_schema — both guarantee valid JSON.
    """
    failure: str = Field(
        description="What went wrong, in plain English"
    )
    root_cause_agent: str = Field(
        description="The agent_id most responsible for the failure"
    )
    root_cause_decision: str = Field(
        description="One sentence describing the bad decision"
    )
    causal_chain: list[str] = Field(
        description="Step-by-step causal chain from root cause to failure"
    )
    counterfactual: str = Field(
        description="If X had happened instead, Y would have been the outcome"
    )
    suggested_fix: str = Field(
        description="One-line code change or config patch that prevents this"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score from 0.0 to 1.0"
    )
