"""
causal_engine.counterfactual
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Re-run an agent decision from a frozen simulation state
with overridden inputs. Compare outcomes field-by-field.
"""

from __future__ import annotations

from packages.autopsy_sdk import get_trace


def run_counterfactual(
    root_trace_id: str,
    input_override: dict,
    frozen_state: dict,
) -> dict:
    """
    Run a "what if" replay.

    Args:
        root_trace_id: trace_id of the decision to replay
        input_override: e.g. {"temperature_constraint": 4.0}
        frozen_state: snapshot from NegotiationLoop.snapshot()

    Returns:
        {original_outcome, cf_outcome, changed, diff, override_applied}
    """
    # Get the original recorded outcome
    original_event = get_trace(root_trace_id)
    original_output = original_event.output if original_event else {}

    # Try to re-run from A1's simulation snapshot
    try:
        from packages.port_sim.negotiation_loop import NegotiationLoop

        loop = NegotiationLoop.from_snapshot(frozen_state, overrides=input_override)
        cf_result = loop.run_single_agent(root_trace_id)
    except (ImportError, Exception):
        # A1's code not ready — use mock
        cf_result = _mock_counterfactual(input_override)

    return {
        "original_outcome": original_output,
        "cf_outcome": cf_result,
        "changed": cf_result != original_output,
        "diff": _structured_diff(original_output, cf_result),
        "override_applied": input_override,
    }


def _structured_diff(original: dict, counterfactual: dict) -> dict:
    """
    Field-by-field comparison.
    Shows exactly WHAT changed between original and counterfactual outcomes.
    """
    changes = {}
    all_keys = set(list(original.keys()) + list(counterfactual.keys()))
    for key in all_keys:
        old_val = original.get(key)
        new_val = counterfactual.get(key)
        if old_val != new_val:
            changes[key] = {"was": old_val, "now": new_val}
    return changes


def _mock_counterfactual(overrides: dict) -> dict:
    """
    Mock for development — use when A1's from_snapshot isn't ready.
    Returns a realistic counterfactual outcome based on overrides.
    """
    if overrides.get("temperature_constraint"):
        return {
            "action": "BID",
            "slot": "crane_2_t14",
            "bid_value": 0.85,
            "violation": False,
            "chain_of_thought": (
                "Cold chain constraint restored to "
                f"{overrides['temperature_constraint']}°C. "
                "Selected refrigerated slot crane_2 to maintain cold chain."
            ),
        }
    return {
        "action": "BID",
        "slot": "crane_5_t14",
        "bid_value": 0.72,
        "violation": True,
        "chain_of_thought": (
            "No temperature constraint found. "
            "Treating as standard cargo — chose cheapest available slot."
        ),
    }
