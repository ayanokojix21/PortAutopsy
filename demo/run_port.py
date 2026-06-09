"""
demo/run_port.py
~~~~~~~~~~~~~~~~
Run the full port simulation: 200 agents negotiate for crane slots.
Compares multi-agent negotiation vs FIFO baseline.
"""

import sys
import pathlib

# -- Add project root to Python path --
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from packages.port_sim.containers import spawn_containers
from packages.port_sim.resources import PortResources
from packages.port_sim.negotiation_loop import NegotiationLoop
from packages.port_sim.fifo_baseline import run_fifo
from packages.autopsy_sdk import get_trace_count
import json


def main():
    print("=" * 56)
    print("  PortAutopsy -- Port Simulation")
    print("=" * 56)

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

    # -- Run decentralised negotiation --
    print(f"\n  Running decentralised negotiation...")
    resources = PortResources()
    loop = NegotiationLoop(containers, resources)
    allocs = loop.run()
    eligible = 200 - customs_blocked
    print(f"     [OK] Allocated {len(allocs)}/{eligible} eligible containers")
    print(f"     {get_trace_count()} trace events recorded")
    print(f"     {len(loop.round_history)} rounds across {loop.round_history[-1]['wave'] + 1 if loop.round_history else 0} waves")
    if loop.violations:
        print(f"     ⚠ {len(loop.violations)} constraint violations detected")
        for v in loop.violations[:3]:
            print(f"       - {v['type']}: {v['detail']}")

    # -- Save state for counterfactual replay --
    snap = loop.snapshot()
    state_path = pathlib.Path("saved_state.json")
    state_path.write_text(json.dumps(snap, default=str), encoding="utf-8")
    print(f"     State saved to {state_path}")

    # -- Run FIFO baseline --
    print(f"\n  Running FIFO baseline...")
    fifo_resources = PortResources()
    fifo_allocs = run_fifo(containers, fifo_resources)
    print(f"     [OK] FIFO allocated {len(fifo_allocs)}/{eligible} eligible containers")

    # -- Comparison --
    improvement = (
        (len(allocs) - len(fifo_allocs)) / max(len(fifo_allocs), 1) * 100
    )
    print(f"\n  Multi-agent is {improvement:+.0f}% vs FIFO")
    print(f"\n  [OK] Simulation complete!")
    print(f"     Traces: traces.jsonl, traces.db")
    print(f"     State:  saved_state.json")
    print(f"\n  Next: python demo/inject_failure.py cold_chain")
    print("=" * 56)


if __name__ == "__main__":
    main()
