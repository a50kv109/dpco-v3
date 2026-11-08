# DPCO Execution Model

## 1. Overview
The DPCO Execution Model defines how tasks flow from AI agents through validation, deterministic dispatch, execution, independent verification, and tamper-evident logging.

## 2. Pipeline Stages
1. **Task Ingestion:** JSON task received from AI agent.
2. **Validation & Contradiction Check:** Parameter verification and consistency check.
3. **Registry & Admission Check:** Matching capabilities against fail-closed admission grants.
4. **Execution:** Invoking built-in sync executors or async DEAS-1 external adapters.
5. **Independent Verification:** Autonomous audit of result correctness.
6. **Classification & Ledger:** Epistemic classification and SHA-256 block recording.
