"""
demo/sdk_example.py
~~~~~~~~~~~~~~~~~~~
Standalone SDK showcase -- shows instrumenting a completely
different agent (not port-related) in ~10 lines.

This sells the "picks and shovels" pitch:
  The port is the DEMO; the SDK is the PRODUCT.
"""

import sys
import pathlib

# -- Add project root to Python path --
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

# -- Add packages to Python path --

from packages.autopsy_sdk import trace_agent, get_traces

# -- Example 1: Customer support agent --

@trace_agent
def customer_support_agent(agent_id: str, ticket: str, context: dict) -> dict:
    """A completely different domain -- NOT a port container."""
    if "billing" in ticket.lower():
        return {
            "action": "escalate",
            "reason": "billing_dispute",
            "chain_of_thought": "Billing issue detected, escalating to finance team.",
        }
    return {
        "action": "respond",
        "reason": "general_inquiry",
        "chain_of_thought": "Standard query, providing automated response.",
    }


# -- Example 2: Content moderation agent --

@trace_agent
def content_moderator(agent_id: str, content: str, policy: dict) -> dict:
    """Another domain -- content moderation."""
    flagged = any(word in content.lower() for word in policy.get("blocked_words", []))
    return {
        "action": "block" if flagged else "approve",
        "flagged": flagged,
        "chain_of_thought": f"Content {'contains' if flagged else 'does not contain'} blocked terms.",
    }


def main():
    print("=" * 56)
    print("  AgentAutopsy SDK -- Standalone Example")
    print("=" * 56)
    print()
    print("  Instrumenting two non-port agents with @trace_agent...")
    print()

    # Run agents normally -- @trace_agent captures everything
    customer_support_agent(
        agent_id="support_01",
        ticket="T-1234: My billing is wrong",
        context={"customer_tier": "premium"},
    )
    customer_support_agent(
        agent_id="support_02",
        ticket="T-1235: How do I reset my password?",
        context={"customer_tier": "free"},
    )
    content_moderator(
        agent_id="mod_01",
        content="This is a normal comment",
        policy={"blocked_words": ["spam", "scam"]},
    )
    content_moderator(
        agent_id="mod_02",
        content="This is a scam product",
        policy={"blocked_words": ["spam", "scam"]},
    )

    # Query traces -- all decisions are captured
    traces = get_traces()
    print(f"  [OK] {len(traces)} trace events captured!")
    print()

    for t in traces:
        status_icon = "[OK]" if t.status.value == "success" else "[ERR]"
        print(f"  {status_icon} {t.agent_id}")
        print(f"     Action: {t.output.get('action', '?')}")
        print(f"     CoT: {t.chain_of_thought or 'N/A'}")
        print(f"     Duration: {t.duration_ms:.1f}ms")
        print()

    print("  The port simulation is the DEMO.")
    print("  This SDK is the PRODUCT.")
    print("  Any multi-agent system can be instrumented in 10 lines.")
    print("=" * 56)


if __name__ == "__main__":
    main()
