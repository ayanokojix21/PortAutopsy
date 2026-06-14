"""
demo/run_port.py
~~~~~~~~~~~~~~~~
Run the full port simulation: 200 agents negotiate for crane slots.
Compares multi-agent negotiation vs FIFO baseline.

Use --fresh to force a full negotiation even if saved_state.json exists.
"""

import sys
import pathlib
import json

# -- Add project root to Python path --
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from packages.port_sim.containers import spawn_containers, Container
from packages.autopsy_sdk import get_trace_count


SAVED_STATE = pathlib.Path("saved_state.json")


def main():
    print("=" * 56)
    print("  PortAutopsy -- Port Simulation")
    print("=" * 56)

    fresh = "--fresh" in sys.argv

    # -- Check for preloaded state --
    if SAVED_STATE.exists() and not fresh:
        print(f"\n  Loading saved state from {SAVED_STATE} (skip negotiation)")
        print(f"  Use --fresh to force a full re-run")
        state = json.loads(SAVED_STATE.read_text(encoding="utf-8"))
        allocs = state.get("allocations", {})
        violations = state.get("violations", [])
        containers = [Container(**c) for c in state.get("containers", [])]

        cold_count = sum(1 for c in containers if c.cargo_type == "cold_chain")
        hazmat_count = sum(1 for c in containers if c.cargo_type == "hazmat")
        customs_blocked = sum(1 for c in containers if not c.customs_cleared)
        eligible = len(containers) - customs_blocked

        print(f"\n  Loaded {len(containers)} containers:")
        print(f"     Standard:   {len(containers) - cold_count - hazmat_count}")
        print(f"     Cold chain: {cold_count}")
        print(f"     Hazmat:     {hazmat_count}")
        print(f"     Allocated:  {len(allocs)}/{eligible}")
        if violations:
            print(f"     ⚠ {len(violations)} constraint violations")
        print(f"\n  [OK] State loaded from saved_state.json")
        print("=" * 56)
        return

    # -- Spawn containers --
    containers = spawn_containers(200)
    cold_count = sum(1 for c in containers if c.cargo_type == "cold_chain")
    hazmat_count = sum(1 for c in containers if c.cargo_type == "hazmat")
    customs_blocked = sum(1 for c in containers if not c.customs_cleared)
    print(f"\n  Spawned 200 containers:")
    print(f"     Standard:   {200 - cold_count - hazmat_count}")
    print(f"     Cold chain: {cold_count}")
    print(f"     Hazmat:     {hazmat_count}")
    print(f"     Customs blocked: {customs_blocked}")

    # -- Run agents + FIFO via the shared runner (computes real metrics, saves
    #    a snapshot with agent_metrics/fifo_metrics so /metrics works too) --
    print(f"\n  Running decentralised negotiation...")
    from packages.port_sim.runner import run_simulation
    eligible = 200 - customs_blocked
    result = run_simulation(200, save=True)
    am, fm = result["agent_metrics"], result["fifo_metrics"]

    print(f"     [OK] Allocated {result['allocated']}/{result['eligible']} eligible containers")
    print(f"     {get_trace_count()} trace events recorded")
    print(f"     State saved to {SAVED_STATE}")

    print(f"\n  Running FIFO baseline...")
    print(f"     [OK] FIFO allocated {fm['allocated']}/{fm['eligible']} eligible containers")

    # -- Comparison: the real win is constraint compliance, not raw throughput --
    print(f"\n  Cold-chain violations  —  Agent: {am['violations']}   FIFO: {fm['violations']}")
    print(f"  Both engines place ~all cargo, but FIFO breaks the cold chain "
          f"{fm['violations']}× by ignoring refrigeration.")
    print(f"\n  [OK] Simulation complete!")
    print(f"     Traces: traces.jsonl, traces.db")
    print(f"     State:  saved_state.json")
    print(f"\n  Next: python demo/inject_failure.py cold_chain")
    print("=" * 56)


if __name__ == "__main__":
    main()

