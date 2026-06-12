# PortAutopsy

A decentralised port where 200 container-agents negotiate resources autonomously — with a runtime debugger that traces failures, replays counterfactuals, and auto-generates fixes.

## Quick start

    cp .env.example .env    # add ANTHROPIC_API_KEY
    make install            # install backend and frontend dependencies
    make run-server &       # FastAPI on :8000
    make run-dashboard &    # React on :5173

## Demo walkthrough

1. Open the dashboard in your browser
2. In a new terminal: `make run-sim`
3. Watch the negotiation complete and container allocations happen
4. In a new terminal: `make inject SCENARIO=cold_chain`
5. Watch throughput drop in the metrics panel
6. Click "Run Autopsy" in the dashboard
7. See root cause identified in seconds with suggested fix

## Manual Commands

    make install            # install all packages
    make run-server         # FastAPI on :8000
    make run-dashboard      # React frontend
    make run-sim            # run simulation
    make inject SCENARIO=cold_chain
    make autopsy

## Failure scenarios

| Scenario | Command | What it does |
|----------|---------|--------------|
| Cold chain | `make inject SCENARIO=cold_chain` | Drops temperature constraint → cargo spoils |
| Deadlock | `make inject SCENARIO=deadlock` | Two agents bid MAX on same slot |
| Cascade | `make inject SCENARIO=cascade` | Urgency misread triggers chain of delays |

## Architecture

- `packages/port_sim` — Python simulation engine
- `packages/autopsy_sdk` — Instrumentation layer
- `packages/causal_engine` — DAG builder + counterfactual engine
- `packages/llm_analyzer` — LLM root cause analysis
- `frontend` — React frontend
- `server.py` — FastAPI server + WebSocket bridge
