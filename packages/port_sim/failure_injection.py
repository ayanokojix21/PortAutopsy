"""
port_sim.failure_injection
~~~~~~~~~~~~~~~~~~~~~~~~~~
Injectible bugs for demo scenarios.
Each function patches agent behavior to introduce a specific failure mode
that the autopsy pipeline can detect, explain, and (via the Master Agent's
policy engine) heal.

Each scenario is designed so that:
  1. The injected decision is captured in the trace (inputs preserve the
     *real* container state, the chain-of-thought reveals the bad reasoning).
  2. A rule in causal_engine.failure_detector fires on the resulting trace.
  3. The corresponding policy in policy_engine, once enabled by the healer,
     blocks the bad bid on a re-run — so violations visibly drop.
"""

from __future__ import annotations


# Refrigerated cranes are crane_0, crane_6, crane_12, crane_18 (first per berth).
def _crane_num(slot: str) -> int:
    """Parse 'crane_N' → N. Returns -1 if it doesn't match."""
    try:
        return int(str(slot).split("_")[1])
    except (IndexError, ValueError):
        return -1


def _is_refrigerated(slot: str) -> bool:
    n = _crane_num(slot)
    return n >= 0 and n % 6 == 0


def inject_cold_chain_bug() -> None:
    """
    Silently drops the temperature constraint on cold-chain cargo, so the
    agent treats it as standard freight and bids on a NON-refrigerated slot.
    Effect: cold chain is broken → cargo spoils.

    Healed by: ENFORCE_COLD_CHAIN policy (rejects cold-chain bids on
    non-refrigerated slots at decision time).
    """
    from packages.port_sim import agents

    _original = agents.container_decide.__wrapped__

    def _buggy(agent_id, container, available_slots, round_num=0, **kwargs):
        if container.cargo_type == "cold_chain" and available_slots:
            # --- THE BUG: temperature_constraint silently dropped to None ---
            container.temperature_constraint = None
            non_ref = [s for s in available_slots if not _is_refrigerated(s)]
            if non_ref:
                import random
                slot = random.choice(non_ref)
                return {
                    "action": "BID",
                    "slot": slot,
                    "bid_value": 0.95,
                    "violation": True,
                    "chain_of_thought": (
                        "No temperature constraint found — treating as standard "
                        f"cargo. Chose cheapest available slot {slot}."
                    ),
                }
        return _original(
            agent_id=agent_id,
            container=container,
            available_slots=available_slots,
            round_num=round_num,
            **kwargs,
        )

    # Re-wrap with trace_agent so traces still capture the buggy behavior.
    from packages.autopsy_sdk import trace_agent
    agents.container_decide = trace_agent(_buggy)
    agents.container_decide.__wrapped__ = _buggy

    print("  [BUG] FAILURE INJECTED: Cold chain constraint silently dropped")


def inject_deadlock_bug() -> None:
    """
    Two containers always bid MAX on the same slot → contention / deadlock.

    Healed by: ENFORCE_DEADLOCK_PREVENTION (tie-breaks max bids).
    """
    from packages.port_sim import agents

    _original = agents.container_decide.__wrapped__
    _count = {"n": 0}

    def _buggy(agent_id, container, available_slots, round_num=0, **kwargs):
        if _count["n"] < 2 and available_slots:
            _count["n"] += 1
            return {
                "action": "BID",
                "slot": "crane_0",
                "bid_value": 1.0,
                "chain_of_thought": (
                    "Deadlock: bidding MAX (1.0) on crane_0 regardless of "
                    "contention — will never yield the slot."
                ),
            }
        return _original(
            agent_id=agent_id,
            container=container,
            available_slots=available_slots,
            round_num=round_num,
            **kwargs,
        )

    from packages.autopsy_sdk import trace_agent
    agents.container_decide = trace_agent(_buggy)
    agents.container_decide.__wrapped__ = _buggy
    print("  [BUG] FAILURE INJECTED: Deadlock - two agents always bid MAX on crane_0")


def inject_cascade_bug() -> None:
    """
    Misreads HIGH/CRITICAL urgency as low priority and under-bids, so urgent
    cargo loses every auction and is delayed — a cascade of late critical loads.
    The container's real urgency is left intact (so the trace input shows the
    true HIGH/CRITICAL), but the chain-of-thought reveals the misread.

    Healed by: ENFORCE_URGENCY (prioritises high-urgency cargo).
    """
    from packages.port_sim import agents

    _original = agents.container_decide.__wrapped__

    def _buggy(agent_id, container, available_slots, round_num=0, **kwargs):
        decision = _original(
            agent_id=agent_id,
            container=container,
            available_slots=available_slots,
            round_num=round_num,
            **kwargs,
        )
        # --- THE BUG: urgency misread → urgent cargo under-bids and is starved.
        # Keep the original (safe) slot choice so this is a pure urgency fault,
        # not a cold-chain one; only the priority/bid is corrupted.
        if container.urgency in ("HIGH", "CRITICAL") and decision.get("action") == "BID":
            decision["bid_value"] = 0.15
            decision["chain_of_thought"] = (
                f"Read urgency as low priority — {container.urgency} cargo "
                "is not urgent, deferring with a minimal bid."
            )
        return decision

    from packages.autopsy_sdk import trace_agent
    agents.container_decide = trace_agent(_buggy)
    agents.container_decide.__wrapped__ = _buggy
    print("  [BUG] FAILURE INJECTED: Cascade - HIGH/CRITICAL urgency misread as low priority")


def reset_injections() -> None:
    """
    Remove all injected bugs by restoring the original container_decide.
    Called before a clean simulation run so a fresh /run is never tainted
    by a previous injection.
    """
    from packages.port_sim import agents
    from packages.autopsy_sdk import trace_agent

    # The pristine decision function still lives at module import as the
    # undecorated `container_decide`; re-decorate a clean reference to it.
    original = getattr(agents, "_pristine_container_decide", None)
    if original is not None:
        agents.container_decide = trace_agent(original)
        agents.container_decide.__wrapped__ = original
