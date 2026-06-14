"""
port_sim.runner
~~~~~~~~~~~~~~~
Single orchestration entry point used by both the CLI demo scripts and the
FastAPI server. Runs the multi-agent negotiation AND the FIFO baseline on the
same containers, computes real metrics for each, and persists a snapshot
(including those metrics) to saved_state.json.

Keeping this in one place guarantees the dashboard, the CLI, and the
counterfactual replay all see identical, real numbers.
"""

from __future__ import annotations

import json
import pathlib

from .containers import spawn_containers
from .resources import PortResources
from .negotiation_loop import NegotiationLoop
from .fifo_baseline import run_fifo
from .metrics import compute_metrics

SAVED_STATE = pathlib.Path("saved_state.json")


def run_simulation(n: int = 200, save: bool = True) -> dict:
    """
    Run the full comparison (agents vs FIFO) and return a result dict.

    Returns:
        {
          "allocated": int, "total": int, "eligible": int,
          "agent_metrics": {...}, "fifo_metrics": {...},
          "snapshot": {...},   # full NegotiationLoop snapshot for counterfactuals
        }
    """
    containers = spawn_containers(n)

    # ── Multi-agent negotiation ──────────────────────────────
    loop = NegotiationLoop(containers, PortResources())
    allocs = loop.run()
    agent_waves = (
        loop.round_history[-1]["wave"] + 1 if loop.round_history else 1
    )
    agent_metrics = compute_metrics(allocs, containers, agent_waves)

    # ── FIFO baseline (same containers, fresh resources) ─────
    fifo_stats: dict = {}
    fifo_allocs = run_fifo(containers, PortResources(), stats=fifo_stats)
    fifo_metrics = compute_metrics(
        fifo_allocs, containers, fifo_stats.get("waves", 1)
    )

    snapshot = loop.snapshot()
    # Embed metrics in the snapshot so /metrics can read them cross-process.
    snapshot["agent_metrics"] = agent_metrics
    snapshot["fifo_metrics"] = fifo_metrics

    if save:
        SAVED_STATE.write_text(
            json.dumps(snapshot, default=str), encoding="utf-8"
        )

    return {
        "allocated": len(allocs),
        "total": len(containers),
        "eligible": agent_metrics["eligible"],
        "agent_metrics": agent_metrics,
        "fifo_metrics": fifo_metrics,
        "snapshot": snapshot,
    }
