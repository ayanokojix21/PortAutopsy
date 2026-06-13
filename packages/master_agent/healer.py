"""
master_agent.healer
~~~~~~~~~~~~~~~~~~~
The Master Agent that reads an autopsy report and automatically applies
the suggested fix to the Python source code using Gemini.
"""

from __future__ import annotations

import os
import json
import pathlib
from pydantic import BaseModel, Field

class PolicyUpdateInstruction(BaseModel):
    policy_key: str = Field(description="The key of the policy to update (e.g., ENFORCE_COLD_CHAIN, ENFORCE_URGENCY)")
    policy_value: bool = Field(description="The new boolean value for the policy to enforce")
    explanation: str = Field(description="Brief explanation of why this policy was applied")

class MasterAgent:
    def __init__(self):
        self.project_root = pathlib.Path(__file__).parent.parent.parent

    def implement_fix(self, report: dict) -> dict:
        """Reads the autopsy report and attempts to update the dynamic Policy Engine."""
        from packages.port_sim.policy_engine import engine as policy_engine
        
        print("\n[🛠 ] MASTER AGENT: Initializing Policy Healer...")
        suggested_fix = report.get("suggested_fix", "")
        if not suggested_fix:
            return {"error": "No suggested_fix in report"}

        # ── 1. Ask LLM for the Policy Update ──
        print("[🛠 ] MASTER AGENT: Asking Gemini to generate a Policy Update...")
        policy_update = self._get_policy_from_llm(suggested_fix)

        if not policy_update:
            print("[🛠 ] MASTER AGENT: LLM failed. Using deterministic fallback policy update.")
            policy_update = PolicyUpdateInstruction(
                policy_key="ENFORCE_COLD_CHAIN",
                policy_value=True,
                explanation="Automatically enforcing cold chain routing policy due to fallback."
            )

        # ── 2. Apply the Policy ──
        print(f"[🛠 ] MASTER AGENT: Applying policy {policy_update.policy_key} = {policy_update.policy_value}...")
        policy_engine.set_policy(policy_update.policy_key, policy_update.policy_value)
        
        print("[🛠 ] MASTER AGENT: Policy implemented successfully!")
        
        # Format the diff visualization for the frontend
        diff_str = (
            "{\n"
            f'  "{policy_update.policy_key}": {str(policy_update.policy_value).lower()}\n'
            "}"
        )
        
        return {
            "status": "success",
            "patched_file": "policies.json (Dynamic Rules Engine)",
            "explanation": policy_update.explanation,
            "diff": diff_str
        }

    def _get_policy_from_llm(self, fix: str) -> PolicyUpdateInstruction | None:
        """Call Gemini to get a structured PolicyUpdateInstruction."""
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return None

        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            prompt = f"""You are the Auto-Healer Master Agent for an enterprise port simulator.
You need to fix a bug dynamically without restarting the server.
The autopsy report suggested this fix: "{fix}"

Available Policies in the Policy Engine:
- ENFORCE_COLD_CHAIN: If true, blocks cold chain cargo from bidding on non-refrigerated cranes.
- ENFORCE_URGENCY: If true, prioritizes high urgency cargo.
- ENFORCE_DEADLOCK_PREVENTION: If true, resolves tied max-bids to prevent deadlocks.

Select the most appropriate policy to enable based on the autopsy report.
Provide your response as a JSON object matching the schema.
"""
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": PolicyUpdateInstruction,
                    "temperature": 0.1,
                },
            )
            return response.parsed
        except Exception as e:
            print(f"[Master Agent] LLM Error: {e}")
            return None

