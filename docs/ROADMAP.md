# DPCO Development Roadmap

## Phase 0: Core Architecture Stabilization (Completed)
- Implementation of DPCO v0.2.0 Core and 54-test verification suite.
- CSP-0.2 passport validation and SHA-256 ledger chaining.
- Independent verifier and evidence registry.

## Phase 1: DEAS-1 Contract Design & Specifications (Current Baseline)
- Freezing DEAS-1 Revision 1 specification.
- Defining asynchronous `IDeasExecutor` contract, capability descriptors, structured errors, and artifact security.

## Phase 2: PythonAdapter & SymPy Integration
- Implementing `PythonAdapter` to connect external exact symbolic computation (SymPy).
- Testing out-of-process JSON subprocess communication and error normalization.

## Phase 3: AI Geometry Skill Adapter Integration
- Connecting external 2D geometry skill via DEAS-1 without modifying core engine source code.
- Running differential cross-verification between DPCO rational fractions and external float64 geometry engines.

## Phase 4: Workflow DAG Engine & Multi-Tool Pipelines
- Introducing lightweight DAG execution graphs for multi-step arithmetic and geometric pipelines.
