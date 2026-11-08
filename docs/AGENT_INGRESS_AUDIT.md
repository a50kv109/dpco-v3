# DPCO V3 Agent Ingress Audit

**Audit date:** 2026-11-08  
**Scope:** Existing agent-facing entry points, task and result contracts, capability discovery, admission, and integration documentation. No runtime or mathematical code was changed.

## Executive summary

DPCO V3 has an **in-process TypeScript API**: `DPCOCore.processTask(task, forceExecutor?)`. It is not a network service or a supported external-agent transport. The React/Vite application is a local UI that calls the same core in the browser.

There are material contract gaps:

1. The schema and capability manifest advertise `solve_system_multivar`, but the runtime registers the matrix solver as `solve_system`. The former is rejected by the runtime registry.
2. The JSON Schema is not applied at runtime. The TypeScript task type allows arbitrary operation strings and loosely typed parameter objects.
3. Default core construction creates no admission grant or qualification evidence, so production dispatch is fail-closed and returns `BLOCKED` until a trusted host explicitly qualifies and admits an executor.
4. The UI startup invokes the three verification suites directly on a fresh core, without the acceptance runner's test-only setup. Executing that same sequence produced **36/54**, not 54/54.
5. REST, MCP, CLI, and Python agent adapters are not implemented.

**Conclusion:** DPCO V3 is not currently a plug-and-play ingress for external agents. Do not describe the internal method, UI, manifest, or DEAS-1 design as a supported external-agent protocol.

## IMPLEMENTED

### Entry point and types

- The internal entry point is `DPCOCore.processTask(task: Task, forceExecutor?: string | null): TaskProcessResult`, implemented in [`src/core/dpcoCore.ts`](../src/core/dpcoCore.ts).
- `Task` is declared in [`src/core/models.ts`](../src/core/models.ts). Its required TypeScript fields are `id: string`, `operation: string`, and `params: Record<string, any>`. `claim`, `constraints`, and `execution_mode` are optional.
- `processTask` returns `{ log, steps }`. The `log` is a `LedgerRecord`; `steps` describe validation, contradiction gating, dispatch, execution, verification, classification, and ledger recording.
- The optional `forceExecutor` parameter is an internal override, not an external-agent selection interface.

### Validation and operations

- `ConstraintValidator` performs runtime checks for `solve_linear` and `solve_system` inputs. Matrix-form multivariable input is handled under `operation: "solve_system"` with `params.matrix` and `params.rhs`.
- `solve_system` also supports the legacy one-variable `params.eqs` format. The optional `enableMultiVarSolver()` registers the exact matrix solver under this same operation name.
- The runtime registry contains scalar and geometry executors; the legacy and multivariable system executors are enabled explicitly.
- Unknown operations generally pass the operation-specific validator and then return `BLOCKED` with `CAPABILITY_GAP` when dispatch finds no admitted executor. This is not a complete request-schema validation path.

### Capability discovery and admission

- Static discovery helpers are exported from [`src/core/capabilityManifest.ts`](../src/core/capabilityManifest.ts): `listSupportedOperations()` and `getOperationCapability(id)`.
- Runtime inspection is available through the in-process `core.registry`, including `getAllExecutors()`, `getExecutor(id)`, `getCandidates(task)`, and `isCompatible(task, executorId)`.
- `getAllExecutors()` reports registrations; `getCandidates(task)` reports executors that pass current compatibility, admission, and evidence checks. Neither is a network discovery endpoint.
- Admission and evidence operations exist on the in-process registry. The API does not provide an external identity or authorization boundary for callers that can access the core object.
- A new `DPCOCore()` has no automatic admission grants or `TEST_SUITE_PASSED` evidence. Production execution is therefore fail-closed until a trusted qualification process supplies valid evidence and an explicit grant.

## TESTED

### Previously recorded V3 validation

The V3 validation report records these acceptance-run results:

- `npx tsx scripts/run_all_tests.ts`: **54/54 passed**.
- `npx tsx scripts/test_multivar_suite.ts`: **39/39 passed**.

Those commands use test support that performs direct checks and creates temporary, in-memory test grants. They do not establish production admission for a normal application instance.

### Audit probes

- A direct registry compatibility probe after `enableMultiVarSolver()` returned `UNSUPPORTED_OPERATION: solve_system_multivar`.
- The same probe using `solve_system` reached the expected qualification-evidence check. This confirms the runtime operation name but does not itself qualify or admit the executor.
- The exact three suite functions called by [`src/App.tsx`](../src/App.tsx) were executed in order on one fresh `DPCOCore`: core **11/19**, CSP **9/10**, Revision 4 **16/25**, totaling **36/54**. Failures were `T01`, `T02`, `T05`, `T06`, `T07`, `E01`, `E02`, `E03`, `CSP-T10`, `R4-D02`, `R4-D03`, `R4-F01` through `R4-F06`, and `R4-G03`.
- A fresh core given a structurally valid exact `solve_linear` task returned `BLOCKED / UNKNOWN / UNVERIFIED` with `reason: "CAPABILITY_GAP"`, `grant_id: null`, and no evidence IDs. This is the expected fail-closed default, not a successful solve.

The suite-function probe was not a browser test. The browser UI itself remains **NOT_TESTED**.

## DESIGNED

- DEAS-1 describes an asynchronous external-executor contract and transport adapters. [`adapters/README.md`](../adapters/README.md) labels those adapters **DESIGNED**.
- [`INTEGRATION_GUIDE.md`](../INTEGRATION_GUIDE.md) describes the DEAS-1 design; it does not document a currently runnable transport.
- Architecture and roadmap documents describe planned Python, CLI, MCP, and API adapter work. These are plans, not implemented entry points.

## MISSING

- A supported external-agent transport and protocol: no REST endpoint, MCP server, CLI task interface, or Python client/bridge was found.
- Runtime enforcement of [`schemas/v1/task.json`](../schemas/v1/task.json). Its own `$comment` says AJV validation is not implemented.
- A consistent, authoritative operation contract. The schema and manifest list `solve_system_multivar`, but the runtime executor registers only `solve_system`.
- Operation-specific schemas for every operation, stable machine-readable error codes, protocol/version negotiation, and a documented successful production-admission lifecycle.
- External authentication/authorization around task submission, capability inspection, evidence changes, and grant issuance.
- Evidence records returned with the task response. `evidence_ids_used` contains active evidence IDs for the selected executor; the result does not include evidence documents or a remote retrieval link. The current field is not a precise list of the individual evidence records matched by the compatibility decision.
- Durable external persistence for evidence and grants; these registries are in-memory.

## NOT_TESTED

- Browser/UI interaction and its displayed test results.
- REST, MCP, CLI, Python, or any other external-agent integration.
- Production deployment, transport security, and external caller authentication.
- A production-admitted request through a supported external ingress.

## Files and findings

- [`src/core/dpcoCore.ts`](../src/core/dpcoCore.ts) — actual in-process entry point and processing pipeline.
- [`src/core/models.ts`](../src/core/models.ts) — TypeScript task and response contracts.
- [`src/core/validation.ts`](../src/core/validation.ts) — partial runtime parameter validation.
- [`src/core/registry.ts`](../src/core/registry.ts) — runtime capabilities, candidates, evidence, and admission.
- [`src/core/capabilityManifest.ts`](../src/core/capabilityManifest.ts) and [`schemas/v1/task.json`](../schemas/v1/task.json) — static contracts; multivariable operation-name mismatch.
- [`src/App.tsx`](../src/App.tsx) — browser app invokes the test suites on a fresh core.
- [`docs/DPCO_V3_VALIDATION_REPORT.md`](./DPCO_V3_VALIDATION_REPORT.md) — prior CLI acceptance results and test-only qualification details.

