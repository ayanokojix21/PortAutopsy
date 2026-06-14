from packages.port_sim.runner import run_simulation
from packages.port_sim.failure_injection import inject_cold_chain_bug
import json

inject_cold_chain_bug()
res = run_simulation(200, save=False)
print("Violations calculated by metrics:", res["agent_metrics"]["violations"])

loop_violations = len(res["snapshot"]["violations"])
print("Violations tracked by loop:", loop_violations)
print("Policy:", __import__('packages.port_sim.policy_engine', fromlist=['policy_engine']).engine.get_policy('ENFORCE_COLD_CHAIN'))
