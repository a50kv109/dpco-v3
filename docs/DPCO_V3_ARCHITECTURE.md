# DPCO V3 Architecture

## Purpose and frozen scope

DPCO V3 is specialized Agent Support Middleware for supported mathematical and discrete-geometry operations. It mediates between an AI agent and deterministic executors; it is not an agent, a universal workflow engine, or a general application manager.

The V3 scope is frozen to stabilizing the inherited architecture. It adds no new mathematical operation, executor subsystem, SOL runtime or Triad adapter, or generic workflow abstraction.

## Responsibility boundaries

1. **AI Agent — task authoring:** formulates a structured task or claim. DPCO does not replace the agent's reasoning.
2. **DPCO core — control:** validates task parameters, checks supported contradictions, applies capability/admission rules, dispatches, classifies outcomes, and records execution.
3. **Specialized executors — computation:** perform supported scalar arithmetic, linear systems, and discrete 2D geometry operations.
4. **IndependentVerifier — result checking:** checks supported mathematical relations independently of the executor's proposed result.
5. **Evidence Registry — qualification state:** stores evidence records and explicit admission grants.
6. **Ledger — execution history:** appends hash-chained records for pipeline outcomes.

`ExecStatus`, `ClaimVerdict`, and `VerifyStatus` are separate dimensions. A successful execution is not itself a verified mathematical result.

## Implemented components

| Component | Status | Boundary |
|---|---|---|
| Task validation and contradiction gate | **IMPLEMENTED** | Input and supported equation consistency checks; not a general theorem prover |
| Capability registry, dispatcher, admission grants | **IMPLEMENTED** | In-memory policy and capability selection |
| BigInt rational `Fraction` arithmetic | **IMPLEMENTED** | Exact rational arithmetic; finite JavaScript numbers are interpreted from their shortest decimal representation |
| `MultiVarLinearExecutor` | **IMPLEMENTED** | Exact Gaussian elimination for supported linear systems over Q |
| Residual verifier | **IMPLEMENTED** | Establishes exact `A·x=b` for the supplied vector only; does not establish uniqueness |
| Geometry operations and verifier | **IMPLEMENTED** | Supported discrete 2D fixtures and operations only |
| Evidence ingestion | **IMPLEMENTED** | Validates profile result fields and stores profile/revision/environment metadata; does not authenticate the submitting process |
| Ledger | **IMPLEMENTED** | SHA-256 hash chain detects record mutation relative to the chain; it is not an externally anchored signature |
| DEAS-1 external runtime | **DESIGNED** | No running external executor bridge is included |

## Multi-variable solver behavior

`MultiVarLinearExecutor` is registered only when `enableMultiVarSolver()` is called. It has no bootstrap `AdmissionGrant` or `EVID-MULTIVAR-TESTED` record. Its effective role remains `UNCLASSIFIED` until an explicit grant is issued, and production compatibility also requires matching active evidence. A diagnostic test invocation does not qualify it for production.

The solver distinguishes:

- a unique solution, returned only when the coefficient matrix has full column rank;
- an inconsistent system, rejected as having no solution;
- an underdetermined system, rejected as not having a unique solution.

The residual verifier rejects empty/zero-column matrices, malformed dimensions, incomplete vectors, extra coordinates, and nonzero residuals. A zero residual proves only that the supplied vector satisfies the system. It does not prove that the system has a unique solution.

## Evidence and admission boundaries

Dynamic registration and core initialization do not grant production admission or create passing-test evidence. A caller-supplied harness name is only an allow-list identifier; it is **not** cryptographic proof that the named harness produced the result. Ingestion records a claimed source revision, runtime environment, test profile, domain, and counts, but cannot independently attest those values or verify an optional artifact hash.

The local acceptance runner performs direct executor smoke checks, ingests their run metadata, and issues explicit grants in its in-memory test core. These grants do not persist and are not created by application initialization. Evidence and grants are held in memory; grant metadata and evidence IDs are not authenticated signatures. See [known limitations](KNOWN_LIMITATIONS.md).

## Explicitly out of scope

- SOL runtime, SOL-Triad Adapter, and decision-layer replacement.
- DEAS-1 runtime or subprocess/worker/container isolation.
- New math/geometry functionality or a generalized execution/workflow engine.
- Claims of complete mathematical correctness, universal verifier independence, or cryptographic harness identity.
