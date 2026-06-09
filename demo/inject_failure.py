"""
demo/inject_failure.py
~~~~~~~~~~~~~~~~~~~~~~
Inject a named failure scenario and re-run the simulation.
Usage: python demo/inject_failure.py [cold_chain|deadlock|cascade]
"""

import sys
import pathlib

# -- Add project root to Python path --
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

# -- Add packages to Python path --

from dotenv import load_dotenv
load_dotenv()

from packages.autopsy_sdk import clear_traces


def main():
    scenario = sys.argv[1] if len(sys.argv) > 1 else "cold_chain"

    print("=" * 56)
    print(f"  Injecting failure: {scenario}")
    print("=" * 56)

    # -- Clear previous traces --
    clear_traces()

    # -- Inject the bug --
    if scenario == "cold_chain":
        from packages.port_sim.failure_injection import inject_cold_chain_bug
        inject_cold_chain_bug()
    elif scenario == "deadlock":
        from packages.port_sim.failure_injection import inject_deadlock_bug
        inject_deadlock_bug()
    elif scenario == "cascade":
        from packages.port_sim.failure_injection import inject_cascade_bug
        inject_cascade_bug()
    else:
        print(f"  [ERROR] Unknown scenario: {scenario}")
        print(f"  Available: cold_chain, deadlock, cascade")
        sys.exit(1)

    # -- Re-run simulation with failure active --
    print(f"\n  Re-running simulation with {scenario} bug active...")
    from packages.port_sim.containers import spawn_containers
    from packages.port_sim.resources import PortResources
    from packages.port_sim.negotiation_loop import NegotiationLoop
    from packages.autopsy_sdk import get_trace_count

    containers = spawn_containers(200)
    loop = NegotiationLoop(containers, PortResources())
    allocs = loop.run()

    print(f"\n  [OK] Post-injection run complete")
    print(f"     Allocated: {len(allocs)}/200")
    print(f"     Traces: {get_trace_count()} events recorded")
    print(f"     Files: traces.jsonl, traces.db")
    print(f"\n  Next: python demo/run_autopsy.py")
    print("=" * 56)


if __name__ == "__main__":
    main()
