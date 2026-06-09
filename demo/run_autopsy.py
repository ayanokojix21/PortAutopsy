"""
demo/run_autopsy.py
~~~~~~~~~~~~~~~~~~~
Run the full autopsy pipeline: trace -> DAG -> detect -> counterfactual -> LLM report.
Usage: python demo/run_autopsy.py
"""

import sys
import pathlib

# -- Add project root to Python path --
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

# -- Add packages to Python path --

from dotenv import load_dotenv
load_dotenv()


def main():
    from packages.llm_analyzer.report_generator import run_autopsy

    print("=" * 56)
    print("  AgentAutopsy -- Root Cause Analysis")
    print("=" * 56)

    try:
        report = run_autopsy()
        print(f"\n  [OK] Autopsy complete!")
        print(f"     Report saved to: autopsy_report.json")
    except Exception as e:
        print(f"\n  [ERROR] Autopsy failed: {e}")
        print(f"     Make sure you've run a simulation first:")
        print(f"       python demo/run_port.py")
        print(f"       python demo/inject_failure.py cold_chain")
        sys.exit(1)


if __name__ == "__main__":
    main()
