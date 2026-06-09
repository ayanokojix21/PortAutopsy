"""
autopsy_sdk.tracer
~~~~~~~~~~~~~~~~~~
The @trace_agent decorator — the single touchpoint A1 (or any user)
puts on their agent functions. Captures inputs, outputs, errors, and
duration automatically. Works with both sync and async functions.

Usage:
    from packages.autopsy_sdk import trace_agent

    @trace_agent
    def my_agent(agent_id, inputs, ...):
        ...
        return {"action": "BID", ...}
"""

from __future__ import annotations

import functools
import inspect
import time
import uuid
from contextvars import ContextVar
from typing import Any

from .models import TraceEvent, EventStatus
from .event_logger import log_event
from .event_stream import push

# ── Context propagation ──────────────────────────────────────
# Nested decorated calls share the same parent trace_id via ContextVar.
# Each asyncio.Task gets its own copy automatically.

_current_trace_id: ContextVar[str | None] = ContextVar(
    "current_trace_id", default=None
)


def _safe_serialize(v: Any) -> Any:
    """Convert non-serializable values to JSON-safe types.
    Handles dataclass objects, lists, dicts, and primitives.
    """
    if v is None or isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, (list, tuple)):
        return [_safe_serialize(item) for item in v]
    if isinstance(v, dict):
        return {str(k): _safe_serialize(val) for k, val in v.items()}
    if hasattr(v, "__dict__"):
        return {
            k: _safe_serialize(val)
            for k, val in v.__dict__.items()
            if not k.startswith("_")
        }
    return str(v)


def _build_inputs(fn: Any, args: tuple, kwargs: dict, param_names: list[str]) -> dict:
    """Merge positional + keyword args into a single inputs dict."""
    inputs: dict[str, Any] = {}
    # Map positional args to their parameter names
    for i, arg in enumerate(args):
        name = param_names[i] if i < len(param_names) else f"arg_{i}"
        inputs[name] = _safe_serialize(arg)
    # Add keyword args
    for k, v in kwargs.items():
        inputs[k] = _safe_serialize(v)
    return inputs


def _make_event(
    trace_id: str,
    agent_id: str,
    round_num: int,
    inputs: dict,
    result: Any | None,
    status: EventStatus,
    duration_ms: float,
    error_msg: str | None = None,
) -> TraceEvent:
    """Build a TraceEvent from captured data."""
    # Extract chain_of_thought if result is a dict
    cot = None
    output = {}
    if isinstance(result, dict):
        cot = result.get("chain_of_thought")
        output = result
    elif result is not None:
        output = {"result": str(result)}

    return TraceEvent(
        trace_id=trace_id,
        agent_id=str(agent_id),
        round=round_num,
        inputs=inputs,
        chain_of_thought=cot,
        output=output,
        status=status,
        error_message=error_msg,
        duration_ms=round(duration_ms, 2),
    )


def trace_agent(fn):
    """
    Decorator that traces any agent function call.
    Works with both sync and async functions.
    Preserves __wrapped__ for failure injection.
    """
    # Cache the parameter names once at decoration time
    sig = inspect.signature(fn)
    param_names = list(sig.parameters.keys())

    if inspect.iscoroutinefunction(fn):
        @functools.wraps(fn)
        async def async_wrapper(*args, **kwargs):
            agent_id = kwargs.get("agent_id") or (args[0] if args else "unknown")
            round_num = kwargs.get("round_num", 0)

            parent = _current_trace_id.get()
            trace_id = parent or f"tr_{uuid.uuid4().hex[:8]}"
            token = _current_trace_id.set(trace_id)

            inputs = _build_inputs(fn, args, kwargs, param_names)
            t0 = time.perf_counter()

            try:
                result = await fn(*args, **kwargs)
                duration = (time.perf_counter() - t0) * 1000.0
                event = _make_event(
                    trace_id, agent_id, round_num, inputs,
                    result, EventStatus.SUCCESS, duration,
                )
                log_event(event)
                push(event)
                return result
            except Exception as e:
                duration = (time.perf_counter() - t0) * 1000.0
                event = _make_event(
                    trace_id, agent_id, round_num, inputs,
                    None, EventStatus.ERROR, duration, str(e),
                )
                log_event(event)
                push(event)
                raise
            finally:
                _current_trace_id.reset(token)

        async_wrapper.__wrapped__ = fn
        return async_wrapper
    else:
        @functools.wraps(fn)
        def sync_wrapper(*args, **kwargs):
            agent_id = kwargs.get("agent_id") or (args[0] if args else "unknown")
            round_num = kwargs.get("round_num", 0)

            parent = _current_trace_id.get()
            trace_id = parent or f"tr_{uuid.uuid4().hex[:8]}"
            token = _current_trace_id.set(trace_id)

            inputs = _build_inputs(fn, args, kwargs, param_names)
            t0 = time.perf_counter()

            try:
                result = fn(*args, **kwargs)
                duration = (time.perf_counter() - t0) * 1000.0
                event = _make_event(
                    trace_id, agent_id, round_num, inputs,
                    result, EventStatus.SUCCESS, duration,
                )
                log_event(event)
                push(event)
                return result
            except Exception as e:
                duration = (time.perf_counter() - t0) * 1000.0
                event = _make_event(
                    trace_id, agent_id, round_num, inputs,
                    None, EventStatus.ERROR, duration, str(e),
                )
                log_event(event)
                push(event)
                raise
            finally:
                _current_trace_id.reset(token)

        sync_wrapper.__wrapped__ = fn
        return sync_wrapper
