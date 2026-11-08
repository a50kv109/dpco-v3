# DEAS-1 Runtime Contract Specification (v0.3.0)

## 1. Objectives & Asynchronous Execution Model
The DEAS-1 (DPCO External Executor Adapter Standard v1) Runtime Contract defines the standard protocol for connecting external computational engines to DPCO Core.

### Key Architectural Constraint:
**Synchronous and asynchronous execution paths are strictly separated.**
- Built-in reference executors operate synchronously via `IExecutor`.
- External external adapters operate asynchronously via `IDeasExecutor.executeTask()`.

---

## 2. Core TypeScript Interfaces (`IDeasExecutor`)

```ts
export type DeasIsolationTier = 
  | 'IN_PROCESS_GUARDED'
  | 'WORKER_ISOLATED'
  | 'PROCESS_ISOLATED'
  | 'CONTAINER_ISOLATED';

export type DeasErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'RESOURCE_LIMIT'
  | 'INVALID_INPUT'
  | 'INVALID_OUTPUT'
  | 'ARTIFACT_TRANSFER_FAILED'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ADAPTER_ERROR';

// ... (CapabilityDescriptor and DeasArtifactReference omitted for brevity in this contract summary)

export interface DeasExecutionResponse {
  task_id: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CANCELLED' | 'BLOCKED';
  result_data?: Record<string, any>;
  artifacts_out?: DeasArtifactReference[];
  error?: DeasNormalizedError | null;
  execution_time_ms: number;
  provenance: {
    executor_id: string;
    system_id: string;
    executed_at: string; // DPCO Runtime evaluates actual isolation tier
  };
}

export interface IDeasExecutor {
  getIdentity(): { executorId: string; systemId: string; version: string; transport: string };
  discoverCapabilities(): Promise<CapabilityDescriptor[]>;
  healthCheck(): Promise<{ healthy: boolean; status: string; activeSessions?: number }>;
  executeTask(request: DeasTaskRequest): Promise<DeasExecutionResponse>;
  cancelTask?(taskId: string): Promise<boolean>;
}
```

---

## 3. Lifecycle & State Management
External executor interaction involves three distinct state models.

### 3.1 Executor States
- `INITIALIZING`: Adapter initializing connection.
- `READY`: Executor idle and healthy.
- `BUSY`: Executor actively processing a task.
- `DEGRADED`: Performance or health issues detected.
- `FAULTED`: Terminal error state.
- `TERMINATED`: Executor shut down.
*Note: BUSY is a workload state, not a synonym for HEALTHY.*

### 3.2 Task States
`QUEUED` → `STARTING` → `RUNNING` → (`COMPLETED` | `FAILED` | `TIMED_OUT` | `CANCELLED` | `FAULTED`).
- Terminal States: `COMPLETED`, `FAILED`, `TIMED_OUT`, `CANCELLED`, `FAULTED` are final states.
- Cancellation: `cancelTask()` may be called in `STARTING` or `RUNNING` states, transitioning Task to `CANCELLED`.

### 3.3 Session States
- `SESSION_OPEN` (Active)
- `SESSION_BUSY` (Active)
- `SESSION_CLOSED` (Terminal)
- `SESSION_EXPIRED` (Terminal)
*Note: Persistence of session state is managed by the external executor; session lifecycle is independent of individual Task requests.*
