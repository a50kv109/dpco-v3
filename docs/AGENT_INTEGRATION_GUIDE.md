# DPCO V3 Agent Integration Guide

## Status and scope

This guide documents the **currently implemented in-process TypeScript API only**. DPCO V3 does not currently provide a REST API, MCP server, CLI task endpoint, Python client, or external-agent adapter. DEAS-1 and its transports are **DESIGNED**, not running implementations.

DPCO is Agent Support Middleware for bounded mathematical and discrete 2D geometry operations. The agent formulates a task; DPCO validates and admits it, dispatches to an executor, independently verifies the result, classifies it, and appends a ledger record. DPCO is not a general-purpose agent runtime.

## Implemented interaction

```text
TypeScript caller in the same process
  -> DPCOCore.processTask(Task)
  -> validation and contradiction gate
  -> capability/admission dispatch
  -> executor
  -> IndependentVerifier
  -> classifier and in-memory ledger
  -> { log, steps }
```

The API is a direct object method, not a transport boundary. Callers must run in a trusted host process. There is no caller authentication or isolation between code holding the `DPCOCore` reference and its public registry.

## Task contract

The TypeScript contract is `Task` in [`src/core/models.ts`](../src/core/models.ts):

```ts
interface Task {
  id: string;
  operation: string;
  params: Record<string, any>;
  claim?: Record<string, any> | null;
  constraints?: {
    exact?: boolean;
    required_rigor?: 'TESTED' | 'INSTANCE_VERIFIED' | 'DOMAIN_VERIFIED';
    domain?: string;
    [key: string]: any;
  };
  execution_mode?: 'PRODUCTION' | 'DIAGNOSTIC_TEST';
}
```

The required fields above are TypeScript-level requirements, not proof of runtime JSON validation. [`schemas/v1/task.json`](../schemas/v1/task.json) defines a stricter JSON Schema, but runtime AJV validation is explicitly not implemented. The schema also currently lists `solve_system_multivar`, which is not the runtime operation name.

### Operation and parameter notes

- `solve_linear`: `params: { a, b, c }` for `a*x + b = c`.
- `solve_system`: legacy one-variable format `params: { eqs: [{ a, b, c }, ...] }`.
- `solve_system`: matrix format `params: { matrix: numberOrRationalString[][], rhs: numberOrRationalString[] }`, after `core.enableMultiVarSolver()`.
- The matrix executor is registered under `solve_system`. Do **not** send `operation: "solve_system_multivar"`; the runtime registry rejects that name.
- Geometry operations are declared in the manifest and registered by the geometry executor. Refer to the runtime registry, not the static manifest alone, for the current process state.
- Rational strings such as `"3/2"` avoid ambiguity when exact rational input is required.

`ConstraintValidator` currently performs operation-specific validation for scalar and `solve_system` input. Other operations do not receive equivalent centralized validation. The caller should validate data before submission; do not treat successful construction of a `Task` or JSON parsing as admission or validation.

## Capability discovery

There are two in-process views, neither of which is a remote discovery protocol:

```ts
import {
  getOperationCapability,
  listSupportedOperations,
} from './src/core/capabilityManifest';

const declaredOperations = listSupportedOperations();
const declaredDetails = getOperationCapability('solve_linear');
```

The manifest is a **static declaration** and is presently inconsistent with runtime registration for `solve_system_multivar`. For the active process, inspect the runtime registry:

```ts
const registrations = core.registry.getAllExecutors();
const candidates = core.registry.getCandidates(task);
```

`getAllExecutors()` reports registered executors and their declared capabilities. `getCandidates(task)` applies the current compatibility, qualification, and admission checks. An enabled operation is not necessarily an admitted operation.

## Admission and evidence

- A normal `new DPCOCore()` creates no production grants or passing-test evidence. Its built-in executors are fail-closed by default.
- `enableMultiVarSolver()` registers the matrix executor; it does **not** qualify or grant production admission.
- A task with no compatible admitted executor returns `BLOCKED`. `execution_mode: "DIAGNOSTIC_TEST"` is not a production grant and must not be used by an external agent as a bypass.
- Qualification evidence must be produced by the trusted, authorized testing process and bound to the required executor, domain, test profile, revision, environment, and run metadata. A harness name is not cryptographic proof of harness identity.
- Admission grants must be issued by the trusted host/operator policy. Do not let an untrusted agent grant itself or select `forceExecutor`.
- Evidence and grants are currently in-memory, not a durable external qualification store.

## TypeScript caller example

This example submits a structurally valid task to a fresh core and handles the actual default behavior. It is expected to be blocked until a trusted qualification and admission process has been performed; it does not manufacture evidence or grants.

```ts
import { DPCOCore } from './src/core/dpcoCore';
import type { Task } from './src/core/models';

const core = new DPCOCore();

const task: Task = {
  id: 'agent-example-001',
  operation: 'solve_linear',
  params: { a: '2', b: '0', c: '3' },
  constraints: { exact: true },
};

const result = core.processTask(task);

console.log({
  status: result.log.final_executionStatus,
  verification: result.log.final_verificationStatus,
  reason: result.log.reason,
  ledgerRecord: result.log.block_index,
});
```

With the current default registry state, the observed result is:

```json
{
  "log": {
    "task_id": "agent-example-001",
    "operation": "solve_linear",
    "reason": "CAPABILITY_GAP",
    "grant_id": null,
    "effective_role": null,
    "evidence_ids_used": [],
    "final_executionStatus": "BLOCKED",
    "final_claimVerdict": "UNKNOWN",
    "final_verificationStatus": "UNVERIFIED"
  },
  "steps": [
    { "step": "validation", "passed": true },
    { "step": "contradiction_gate", "passed": true },
    {
      "step": "registry_dispatch",
      "passed": false,
      "blocked": true,
      "details": "CAPABILITY_GAP: No compatible or qualified executor admitted for this task specification."
    },
    { "step": "classifier", "passed": true },
    { "step": "ledger", "passed": true }
  ]
}
```

Timestamps, ledger hashes, and some step fields are omitted above. A successful production response cannot be promised by this example: it depends on an independently established, current qualification and grant.

## Response, statuses, and errors

`processTask` returns:

```ts
interface TaskProcessResult {
  log: LedgerRecord;
  steps: PipelineStep[];
}
```

Inspect `log.final_executionStatus`, `log.final_claimVerdict`, `log.final_verificationStatus`, `log.reason`, `log.executor`, `log.grant_id`, and `log.evidence_ids_used`. `steps` holds human-readable details and, for some steps, diagnostic data. The ledger record includes a block index and record hash.

The statuses are separate dimensions:

| Execution status | Verification status | Meaning |
|---|---|---|
| `BLOCKED` | `UNVERIFIED` | Processing or dispatch was blocked; no verified result is available. `reason` describes the block, often `CAPABILITY_GAP`, a validation error, a contradiction, or an admission failure. |
| `FAILED` | `NOT_APPLICABLE` | Executor execution failed; inspect `reason` and the execution step. |
| `SUCCESS` | `VERIFIED` | Execution completed and the independent verifier accepted the result. |
| `SUCCESS` | `UNVERIFIED` | Execution completed, but verification did not establish the result. This is not a verified answer. |

`final_claimVerdict` is a separate result and may be `TRUE`, `FALSE`, `UNKNOWN`, or `NOT_APPLICABLE`. `reason` and step details are strings, not a stable machine-readable error-code contract. The response includes evidence IDs but not evidence documents or external evidence URLs.

## Unsupported interfaces and cautions

- No REST/HTTP task endpoint, MCP server, CLI ingress, or Python agent client is implemented. The `express` dependency does not constitute a running API.
- The React/Vite app is a browser UI that invokes `DPCOCore` directly; it is not an external-agent API.
- `INTEGRATION_GUIDE.md` and DEAS-1 transport descriptions are design material, not proof of a functioning adapter.
- The UI startup currently runs the verification suites against a fresh core without the acceptance runner's test-only admission setup. In an audit probe of the same suite-function sequence, 36/54 passed. The browser UI and its displayed state have not been tested.
- Do not interpret `TEST_SUITE_PASSED` evidence as formal proof of algorithm correctness, a manifest declaration as runtime availability, or a residual check as proof of unique solvability.

See [`AGENT_INGRESS_AUDIT.md`](./AGENT_INGRESS_AUDIT.md) for the evidence-based implementation, test, design, missing, and not-tested findings.

