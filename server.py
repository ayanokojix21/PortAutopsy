"""
server.py
~~~~~~~~~
FastAPI server + WebSocket bridge.
A3 owns this file. Connects ML's data to A2's dashboard.
"""

import sys
import json
import asyncio
import pathlib

# ── Add packages to Python path ──────────────────────────────

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AgentAutopsy",
    description="Debugging & observability platform for multi-agent AI systems",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── WebSocket clients ────────────────────────────────────────
_ws_clients: list[WebSocket] = []

# ── Session state (resets on every server restart) ───────────
# Nothing from disk is served until the current session actually runs something.
_session = {
    "ran_simulation": False,   # True after POST /run completes
    "ran_autopsy":    False,   # True after POST /autopsy-report?fresh=true or GET returns real data
    "healed":         False,   # True after POST /heal completes
}


@app.websocket("/ws/events")
async def ws_events(ws: WebSocket):
    """WebSocket endpoint for real-time event streaming to dashboard."""
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            # Keep connection alive; dashboard pushes are via broadcast
            await ws.receive_text()
    except WebSocketDisconnect:
        _ws_clients.remove(ws)


async def _async_broadcast(event_dict: dict):
    """Push an event to all connected dashboard clients (async)."""
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_text(json.dumps(event_dict, default=str))
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


def _on_trace_event(event):
    """
    Callback registered with autopsy_sdk.
    Called from sync code (the tracer), so we schedule the async broadcast
    onto the running event loop.
    """
    try:
        loop = asyncio.get_running_loop()
        event_dict = event.model_dump(mode="json")
        loop.create_task(_async_broadcast(event_dict))
    except RuntimeError:
        pass  # No event loop running (e.g. CLI scripts) — skip broadcast


@app.on_event("startup")
async def _register_ws_bridge():
    """Wire the SDK event stream → WebSocket broadcast on server start."""
    from packages.autopsy_sdk import register_on_event
    register_on_event(_on_trace_event)


# ── REST Endpoints ───────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "AgentAutopsy"}


@app.post("/run")
async def run_simulation():
    """Run a clean 200-agent simulation + FIFO baseline with real metrics."""
    from packages.autopsy_sdk.sdk import clear_traces
    from packages.port_sim.failure_injection import reset_injections
    from packages.port_sim.runner import run_simulation as run_sim

    # Remove any previously injected bug + clear old traces so this run is clean.
    reset_injections()
    clear_traces()

    # Run in a background thread so FastAPI can still serve /metrics while the
    # simulation sleeps between rounds.
    result = await asyncio.to_thread(run_sim, 200, True)

    # Mark this session as having run a simulation
    _session["ran_simulation"] = True
    _session["ran_autopsy"]    = False  # reset autopsy so it reflects the NEW run

    return {
        "allocated": result["allocated"],
        "total": result["total"],
        "eligible": result["eligible"],
        "agent_metrics": result["agent_metrics"],
        "fifo_metrics": result["fifo_metrics"],
        "state_saved": True,
    }


@app.post("/inject/{scenario}")
async def inject_failure(scenario: str):
    """Inject a failure scenario AND re-run the simulation so the dashboard,
    traces, and autopsy all reflect the broken behaviour."""
    from packages.autopsy_sdk.sdk import clear_traces
    from packages.port_sim.failure_injection import (
        inject_cold_chain_bug,
        inject_deadlock_bug,
        inject_cascade_bug,
    )
    from packages.port_sim.runner import run_simulation as run_sim

    handlers = {
        "cold_chain": inject_cold_chain_bug,
        "deadlock": inject_deadlock_bug,
        "cascade": inject_cascade_bug,
    }

    if scenario not in handlers:
        return {"error": f"Unknown scenario: {scenario}. Use: {list(handlers.keys())}"}

    # Fresh traces, then activate the bug and re-run so it shows up everywhere.
    clear_traces()
    handlers[scenario]()
    result = await asyncio.to_thread(run_sim, 200, True)

    return {
        "injected": scenario,
        "allocated": result["allocated"],
        "total": result["total"],
        "agent_metrics": result["agent_metrics"],
        "fifo_metrics": result["fifo_metrics"],
    }


@app.get("/traces")
async def get_traces_endpoint(agent_id: str | None = None):
    """Get all trace events, optionally filtered by agent_id."""
    from packages.autopsy_sdk import get_traces

    traces = get_traces(agent_id)
    return [t.model_dump(mode="json") for t in traces]


@app.get("/causal-graph")
async def get_causal_graph():
    """Build and return the causal graph as D3.js-compatible JSON."""
    try:
        from packages.llm_analyzer.api_helpers import get_graph_json
        return get_graph_json()
    except Exception as e:
        return {"error": str(e), "nodes": [], "edges": []}


@app.get("/autopsy-report")
async def get_autopsy_report(fresh: bool = False):
    """Return the autopsy report.

    Rules:
    - If no simulation has run this session → always return error (nothing to analyze).
    - If autopsy has been run this session and fresh=false → serve cached disk report.
    - Otherwise → run the LLM pipeline fresh.
    """
    report_path = pathlib.Path("autopsy_report.json")

    # Guard: always block if no simulation has run this session (fresh=true won't help)
    if not _session["ran_simulation"]:
        return {"error": "No simulation run yet — run a simulation first, then run autopsy."}

    # Serve cached report if autopsy was already run this session and caller didn't ask for fresh
    if not fresh and _session["ran_autopsy"] and report_path.exists():
        try:
            return json.loads(report_path.read_text())
        except Exception:
            pass  # corrupt cache — fall through to fresh run

    # Run the LLM pipeline
    try:
        from packages.llm_analyzer.api_helpers import get_report_json
        result = get_report_json()
        _session["ran_autopsy"] = True
        return result
    except Exception as e:
        return {"error": str(e)}



@app.post("/heal")
async def heal_codebase():
    """Trigger the Master Agent to implement the suggested fix."""
    try:
        report_path = pathlib.Path("autopsy_report.json")
        if not report_path.exists():
            return {"error": "No autopsy report found to act on."}

        report = json.loads(report_path.read_text())

        from packages.master_agent.healer import MasterAgent
        agent  = MasterAgent()
        result = agent.implement_fix(report)

        _session["healed"] = True
        return result
    except Exception as e:
        return {"error": str(e)}


@app.get("/metrics")
async def get_metrics():
    """Get simulation metrics for the dashboard.

    Returns empty state until the current session has run a simulation.
    Primary source: saved_state.json (written after every /run).
    Fallback: traces.db (SQLite, only present if event_logger is active).
    """
    FIFO_BASELINE = {"throughput": 100, "violations": 3, "dwell": 4.2, "debug": "Manual"}

    # ── Guard: no simulation run yet this session ──────────────────────
    if not _session["ran_simulation"]:
        return {
            "fifo":  {},
            "agent": {},
            "error": "No simulation run yet in this session.",
        }

    # ── Primary: read from saved_state.json ────────────────────────────
    state_path = pathlib.Path("saved_state.json")
    if state_path.exists():
        try:
            state = json.loads(state_path.read_text())
            allocations = state.get("allocations", {})
            violations  = state.get("violations", [])
            containers  = state.get("containers", [])

            total = len(containers) if containers else 200
            throughput      = round(len(allocations) / total * 100) if total else 0
            violation_count = len(violations)

            # Dwell: proxy from simulation time t (each CRANE_OCCUPY_DURATION = 0.5h)
            sim_t   = state.get("t", 0.0)
            alloc_n = max(len(allocations), 1)
            avg_dwell = round(max(1.5, min(6.0, sim_t / alloc_n * 8)), 1)

            return {
                "fifo":  FIFO_BASELINE,
                "agent": {
                    "throughput": throughput,
                    "violations": violation_count,
                    "dwell":      avg_dwell,
                    "debug":      "8 sec (autopsy)",
                },
            }
        except Exception:
            pass  # corrupt state — fall through to SQLite

    # ── Fallback: traces.db (SQLite) ─────────────────────────────────────────
    import sqlite3
    db = pathlib.Path("traces.db")
    if not db.exists():
        return {
            "fifo":  {},
            "agent": {},
            "error": "No simulation yet — run a simulation first",
        }

    try:
        con = sqlite3.connect(db)
        total_agents = con.execute(
            "SELECT COUNT(DISTINCT agent_id) FROM trace_events"
        ).fetchone()[0]

        violations = con.execute(
            "SELECT COUNT(*) FROM trace_events "
            "WHERE output_json LIKE '%\"violation\": true%' "
            "   OR output_json LIKE '%\"violation\":true%'"
        ).fetchone()[0]

        max_round = con.execute(
            "SELECT COALESCE(MAX(round), 0) FROM trace_events"
        ).fetchone()[0]
        avg_dwell  = round(max(1.5, min(6.0, (max_round * 0.5) / max(total_agents, 1) * 40)), 1)
        throughput = round(min(total_agents / 200 * 100, 100)) if total_agents else 0
    finally:
        con.close()

    return {
        "fifo":  FIFO_BASELINE,
        "agent": {
            "throughput": throughput,
            "violations": violations,
            "dwell": avg_dwell,
            "debug": "8 sec (autopsy)",
        },
    }


@app.get("/failure-rules")
async def get_failure_rules():
    """Return available failure detection rules."""
    from packages.causal_engine.failure_detector import get_rules
    return get_rules()
