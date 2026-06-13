"""
port_sim.policy_engine
~~~~~~~~~~~~~~~~~~~~~~
Dynamic Rules Engine to enforce port safety and operational constraints.
In a production system, this replaces risky source code patching.
The Master Agent will update policies.json to "auto-heal" the system dynamically.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any

# For a production system, this could be Redis. We use a local JSON for the hackathon product.
POLICY_FILE = pathlib.Path(__file__).parent.parent.parent / "policies.json"

class PolicyEngine:
    def __init__(self):
        self._cache = {}
        self.reload()

    def reload(self) -> None:
        """Load policies from disk."""
        if POLICY_FILE.exists():
            try:
                self._cache = json.loads(POLICY_FILE.read_text())
            except Exception:
                pass
        else:
            # Default production policies
            self._cache = {
                "ENFORCE_COLD_CHAIN": False,  # If true, reject cold chain bids on standard slots
                "ENFORCE_URGENCY": False,     # If true, reject low urgency cargo if critical is waiting
            }
            self.save()

    def save(self) -> None:
        """Persist policies to disk."""
        POLICY_FILE.write_text(json.dumps(self._cache, indent=2))

    def get_policy(self, key: str, default: Any = False) -> Any:
        return self._cache.get(key, default)

    def set_policy(self, key: str, value: Any) -> None:
        self._cache[key] = value
        self.save()

# Global instance for the simulation
engine = PolicyEngine()
