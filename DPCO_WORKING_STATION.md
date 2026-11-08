# DPCO Working Station Baseline v1.0
**Deterministic Processing & Cognitive Orchestration (DPCO)**  
*Baseline Architecture & Inventory Specification*

---

## 1. Mission Statement

DPCO is a specialized, deterministic orchestration middleware between AI agents and deterministic computational executors, focused strictly on arithmetic, algebra, 2D/3D geometry, geometric constructions, and mathematical verification.

### Core Principle
> **AI Agent THINKS. DPCO ORCHESTRATES. External Executor EXECUTES. Verifier CHECKS. Evidence & Ledger RECORD.**

DPCO does not replace LLMs, nor does it attempt to become a general-purpose desktop application manager. It ensures that mathematical and geometric operations delegated by AI agents are rigorously validated, capability-matched, admission-controlled, independently verified, and cryptographically proven.

---

## 2. Project Scope & Invariants

### What DPCO MUST Do:
- Accept structured mathematical and geometric task requests from AI agents.
- Classify operations and evaluate domain constraints.
- Match tasks against registered capability descriptors and admission grants.
- Enforce fail-closed admission control (`UNCLASSIFIED` default).
- Orchestrate single-step and sequential mathematical evaluations.
- Execute independent cross-verification of results.
- Record tamper-evident provenance in an SHA-256 execution ledger.
- Return structured execution results, verification status, and evidence chains to the AI agent.

### What DPCO MUST NOT Do:
- Replace ChatGPT, Gemini, or any AI language model.
- Implement every known mathematical algorithm or simulation engine.
- Replace CAD systems (AutoCAD, Blender) or become a general operating system process manager.
- Handle non-mathematical workflows such as video editing, document generation, or business process automation.
- Trust self-declared qualifications or isolation claims from external adapters without runtime verification.

---

## 3. Component Inventory & Status Matrix

| Component | Purpose | Status | Source Evidence | Dependencies | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Task Model** | Standardized task request and parameter schema | **TESTED** | `src/core/models.ts` | None | Maintain schema stability |
| **Capability Registry** | Manage executor registrations and capability lookup | **TESTED** | `src/core/registry.ts`, `src/core/cspPassport.ts` | CSP-0.2 parser | Enhance with CapabilityDescriptors |
| **Constraint Validator** | Check parameter types, finiteness, and ranges | **TESTED** | `src/core/validation.ts` | Task Model | Expand validation rules |
| **Contradiction Gate** | Detect internal system inconsistencies | **TESTED** | `src/core/contradiction.ts` | Fraction arithmetic | Maintain invariant checks |
| **Deterministic Dispatcher** | Select lowest cost / lexical executor candidate | **TESTED** | `src/core/dispatcher.ts` | Capability Registry | Support async execution routing |
| **Exact Executor** | Exact rational BigInt fraction arithmetic | **TESTED** | `src/core/fraction.ts`, `src/core/executors.ts` | BigInt math | Maintain exact precision |
| **Numerical Executor** | IEEE 754 floating-point evaluation | **TESTED** | `src/core/executors.ts` | None | Maintain IEEE limits |
| **Linear System Executor** | Consistent multi-equation scalar solver | **TESTED** | `src/core/executors.ts` | Exact Executor | Extend to matrix systems |
| **Geometry Executor** | 2D Euclidean point/line/circle geometry | **TESTED** | `src/core/geometry.ts` | Fraction arithmetic | Connect external AI Geometry Skill via DEAS-1 |
| **Independent Verifier** | Cross-check calculation results | **TESTED** | `src/core/verifier.ts` | Geometry & Arithmetic engines | Expand verification rules |
| **Result Classifier** | Separate execution status, claim verdict, and verification | **TESTED** | `src/core/classifier.ts`, `src/core/models.ts` | Models | Maintain epistemic separation |
| **Evidence Registry** | 5 orthogonal evidence tiers and record tracking | **TESTED** | `src/core/evidence.ts` | Models | Integrate with DEAS-1 qualification |
| **Admission Grant** | Fail-closed role management & revocation | **TESTED** | `src/core/evidence.ts`, `src/core/registry.ts` | Evidence Registry | Support time-windowed grants |
| **Isolation Wrapper** | Prototype sealing, deep JSON clone, timeout limits | **TESTED** | `src/core/isolation.ts` | Execution engine | Transition to runtime isolation authority |
| **Execution Ledger** | SHA-256 block hashing and chain integrity | **TESTED** | `src/core/ledger.ts` | Models | Add external artifact hash anchoring |
| **DEAS-1 Core Contract** | Asynchronous external executor runtime interface | **DESIGNED** | `usca-1.0.md`, DEAS-1 Spec Rev 1 | Capability Registry | Implement PythonAdapter bridge |
| **DAG Workflow Engine** | Multi-tool pipeline execution graph | **PROPOSED** | USCA-1.0 Section 7 | Dispatcher & Ledger | Defer until core DEAS-1 is stable |

---

## 4. Logical Architecture Layers

```
+─────────────────────────────────────────────────────────────────────────────+
|                         AI AGENT (ChatGPT / Gemini)                         |
|     (Formulates hypotheses, reasons about tasks, interprets results)        |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼ (Structured Task Request)
+─────────────────────────────────────────────────────────────────────────────+
|                        DPCO ORCHESTRATION MIDDLEWARE                        |
|  - Task & Constraint Validation / Contradiction Gate                        |
|  - Capability Registry & Deterministic Dispatcher                           |
|  - Admission Control & Evidence Registry (Fail-Closed R-Levels)             |
|  - Independent Verifier & Result Classifier                                 |
|  - Tamper-Evident SHA-256 Execution Ledger                                  |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼ (DEAS-1 Async Contract)
+─────────────────────────────────────────────────────────────────────────────+
|                      EXTERNAL EXECUTOR ADAPTER LAYER                        |
|  - PythonAdapter (SymPy, NumPy)                                             |
|  - CLIAdapter (Subprocess binaries / AI Geometry Skill)                     |
|  - APIAdapter / MCPAdapter / GUIAdapter (Specialized Tools)                |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 5. Agent-DPCO Interaction Model

1. **User Request:** User asks AI Agent (e.g., ChatGPT) a geometric or arithmetic problem.
2. **Agent Reasoning:** Agent analyzes the problem, formulates a mathematical model, and constructs a structured task request.
3. **Task Submission:** Agent sends task to DPCO.
4. **DPCO Validation & Routing:** DPCO validates constraints, checks admission grants (`PRODUCTION` vs `UNCLASSIFIED`), and dispatches to the most cost-effective qualified executor.
5. **Execution & Verification:** The executor computes the result. DPCO's independent verifier audits correctness.
6. **Evidence & Ledger Recording:** DPCO records the transaction in the SHA-256 ledger and associates evidence records.
7. **Structured Return:** DPCO returns the result, verification status, and provenance back to the AI Agent.
8. **Iterative Refinement:** Agent evaluates the output; if verification fails, agent adjusts its hypothesis and retries.

---

## 6. Minimal DEAS-1 Contract Summary

DEAS-1 Revision 1 provides a clean, modular external execution interface:
- **Core Contract (`IDeasExecutor`):** Asynchronous task execution, health check, identity, capability discovery, and timeout cancellation.
- **Capability Descriptor:** Structured CSP-0.2 compatible metadata (schemas, constraints, determinism, precision, artifact formats).
- **Artifact Security:** Secure URIs (`data://`, sandbox-restricted `file://`, `cas://`), path traversal defense, and SHA-256 content hash verification.
- **Structured Error Taxonomy:** 11 normalized error codes (`CONNECTION_FAILED`, `TIMEOUT`, `INVALID_OUTPUT`, etc.).

---

## 7. Next Technical Steps

1. **Stabilize Core:** Keep current 54 passing tests green.
2. **Implement DEAS-1 PythonAdapter:** Connect SymPy via a clean JSON subprocess bridge to prove external exact/symbolic computation.
3. **Connect AI Geometry Skill:** Integrate external 2D geometry engine via DEAS-1 without copying engine code.
4. **Expand Independent Verification:** Add automated cross-checks for external solver outputs.
