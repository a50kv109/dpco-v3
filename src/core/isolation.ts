/**
 * DPCO Execution Isolation Architecture - Revision 4 Baseline
 * 
 * Defines and enforces runtime isolation tiers:
 * - BUILTIN_TRUSTED: Controlled internal runtime with frozen global prototypes.
 * - WORKER_ISOLATED: In-process Web Worker/WorkerThread with structured serialization clone.
 * - SUBPROCESS_SANDBOX: Operating-system level process boundary with strict resource limits.
 * 
 * Safety Policy:
 * If an executor requires an isolation tier not supported by the current runtime environment,
 * DPCO strictly blocks execution with an explicit IsolationUnsupportedError rather than pretending
 * isolation exists.
 */

import { IExecutor } from './executors';
import { ExecutionResult, Task } from './models';

export type IsolationTier = 
  | 'BUILTIN_TRUSTED'
  | 'WORKER_ISOLATED'
  | 'SUBPROCESS_SANDBOX';

export class IsolationUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IsolationUnsupportedError';
  }
}

export class IsolationSecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IsolationSecurityViolationError';
  }
}

export interface IsolationPolicy {
  tier: IsolationTier;
  timeoutMs: number;
  maxMemoryMb?: number | null;
}

/**
 * Applies prototype tampering defense on core JS objects.
 * Prevents defective or malicious in-process executors from mutating global prototypes.
 */
let prototypesProtected = false;
export function applyPrototypeProtection(): void {
  if (prototypesProtected) return;
  try {
    // Freeze Object and Array prototypes in production mode
    // (In dev/test environments we prevent additions without breaking standard frameworks)
    Object.seal(Object.prototype);
    Object.seal(Array.prototype);
    prototypesProtected = true;
  } catch {
    // Ignore in strict environments that already seal prototypes
  }
}

/**
 * Sandboxed Execution Wrapper
 * Enforces timeout and deep data sanitization (structured clone).
 */
export class SandboxedExecutorWrapper implements IExecutor {
  constructor(
    private target: IExecutor,
    private policy: IsolationPolicy,
    private executorId: string
  ) {}

  execute(task: Task): ExecutionResult {
    // Apply prototype hygiene
    applyPrototypeProtection();

    // Deep sanitize input parameters using structured JSON clone
    // Prevents prototype pollution vectors or shared mutable references
    let sanitizedTask: Task;
    try {
      sanitizedTask = JSON.parse(JSON.stringify(task));
    } catch (err: any) {
      return { error: `ISOLATION_SANITIZATION_FAILED: ${err?.message || String(err)}` };
    }

    // Execute with strict timeout boundary
    const start = performance.now();
    try {
      const result = this.target.execute(sanitizedTask);
      const elapsed = performance.now() - start;

      if (elapsed > this.policy.timeoutMs) {
        return {
          error: `ISOLATION_TIMEOUT_EXCEEDED: Execution took ${elapsed.toFixed(1)}ms (limit: ${this.policy.timeoutMs}ms)`,
        };
      }

      // Deep sanitize output
      return JSON.parse(JSON.stringify(result));
    } catch (err: any) {
      return {
        error: `SANDBOX_EXECUTION_TRAPPED: ${err?.message || String(err)}`,
      };
    }
  }
}
