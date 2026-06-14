"""
llm_analyzer.api_helpers
~~~~~~~~~~~~~~~~~~~~~~~~
Clean functions for A3's FastAPI routes.
These return plain dicts/Pydantic models — A3 handles routing.
"""

from __future__ import annotations

import json
import pathlib

from packages.causal_engine.dag_builder import build_dag, export_graph_json
from .report_generator import run_autopsy

_SAVED_STATE = pathlib.Path("saved_state.json")


def get_graph_json() -> dict:
    """Build the causal graph and export as D3.js-compatible JSON."""
    G = build_dag()
    return export_graph_json(G)


def get_report_json() -> dict:
    """
    Run the full autopsy pipeline and return the report as a dict.
    Loads the saved simulation snapshot so the counterfactual replay runs
    against real frozen state (not the mock fallback).
    """
    frozen_state = None
    if _SAVED_STATE.exists():
        try:
            frozen_state = json.loads(_SAVED_STATE.read_text(encoding="utf-8"))
        except Exception:
            frozen_state = None

    report = run_autopsy(frozen_state=frozen_state)
    return report.model_dump()
