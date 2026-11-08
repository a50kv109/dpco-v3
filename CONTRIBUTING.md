# Contributing to DPCO

Thank you for your interest in contributing to **DPCO (Deterministic Processing & Cognitive Orchestration)**! 

DPCO is a specialized orchestration middleware connecting AI agents to mathematical and geometric executors. We welcome contributions that improve mathematical rigor, verification robustness, and DEAS-1 adapter reliability.

## 1. Core Principles for Contributors
- **AI Agent Thinks, DPCO Orchestrates, Verifier Checks:** Do not mix LLM chat logic into DPCO core.
- **Maintain Epistemic Separation:** Never confuse execution success (`ExecStatus`) with claim truth (`ClaimVerdict`) or verification (`VerifyStatus`).
- **Test Coverage:** Every bug fix or feature addition must include comprehensive unit and integration tests.

## 2. Integration Proposal Format
To propose a new external executor or DEAS-1 transport adapter, please provide:
1. **Executor Name & Software System:** e.g., `SymPy Symbolic Engine`.
2. **Subject Capability:** e.g., `algebra.symbolic.integrate`.
3. **Input & Output JSON Schemas.**
4. **Transport Type:** (`PythonAdapter`, `CLIAdapter`, `MCPAdapter`, etc.).
5. **Dependencies & Resource Requirements.**
6. **Isolation Requirements.**
7. **Conformance Test Suite.**
8. **Independent Verification Strategy.**
