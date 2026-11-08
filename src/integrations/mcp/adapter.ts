import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DPCO_CAPABILITY_MANIFEST, OperationCapability } from '../../core/capabilityManifest';
import { DPCOCore } from '../../core/dpcoCore';
import { LedgerRecord, Task } from '../../core/models';
import {
  executeTaskOutputSchema,
  getResultOutputSchema,
  ledgerRecordOutputSchema,
  listCapabilitiesOutputSchema,
  operationIds,
  OperationId,
  resultToolInputSchema,
  taskToolInputSchema,
  validateOperationParams,
  validateTaskOutputSchema,
} from './contracts';

const MAX_TASK_BYTES = 64 * 1024;
const MULTIVAR_OPERATION = 'solve_system_multivar';
const CORE_SYSTEM_OPERATION = 'solve_system';

interface NormalizedTask {
  inputOperation: string;
  operation: OperationId;
  coreOperation: string;
  task: Task;
}

interface TaskCheck {
  normalized: NormalizedTask | null;
  issues: string[];
  compatibleExecutors: string[];
  executionEligible: boolean;
  blockedReason: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTask(raw: Record<string, unknown>): {
  normalized: NormalizedTask | null;
  issues: string[];
} {
  const issues: string[] = [];
  const allowedFields = new Set(['id', 'operation', 'params', 'claim', 'constraints']);
  const forbidden = Object.keys(raw).filter((key) => !allowedFields.has(key));
  if (forbidden.length > 0) {
    issues.push(`Unsupported task fields: ${forbidden.join(', ')}`);
  }

  if (typeof raw.id !== 'string' || raw.id.trim().length === 0 || raw.id.length > 128) {
    issues.push('id must be a non-empty string of at most 128 characters');
  }
  if (typeof raw.operation !== 'string') {
    issues.push('operation must be a string');
  }
  if (!isRecord(raw.params)) {
    issues.push('params must be a JSON object');
  }
  if (raw.claim !== undefined && raw.claim !== null && !isRecord(raw.claim)) {
    issues.push('claim must be an object or null');
  }
  if (raw.constraints !== undefined && !isRecord(raw.constraints)) {
    issues.push('constraints must be an object');
  }
  if (issues.length > 0) return { normalized: null, issues };

  const inputOperation = raw.operation as string;
  if (!operationIds.includes(inputOperation as OperationId)) {
    return {
      normalized: null,
      issues: [`Unsupported operation '${inputOperation}'`],
    };
  }

  const params = raw.params as Record<string, unknown>;
  let operation = inputOperation as OperationId;
  if (inputOperation === CORE_SYSTEM_OPERATION && ('matrix' in params || 'rhs' in params)) {
    operation = MULTIVAR_OPERATION;
  }
  if (operation === MULTIVAR_OPERATION && (!Array.isArray(params.matrix) || !Array.isArray(params.rhs))) {
    return {
      normalized: null,
      issues: ['solve_system_multivar requires params.matrix and params.rhs arrays'],
    };
  }

  const paramIssues = validateOperationParams(operation, params);
  if (paramIssues.length > 0) return { normalized: null, issues: paramIssues };

  const coreOperation = operation === MULTIVAR_OPERATION ? CORE_SYSTEM_OPERATION : operation;
  const constraints = raw.constraints as Task['constraints'] | undefined;
  const task: Task = {
    id: raw.id as string,
    operation: coreOperation,
    params: params as Record<string, any>,
    ...(raw.claim === undefined ? {} : { claim: raw.claim as Record<string, any> | null }),
    ...(constraints === undefined ? {} : { constraints }),
  };

  return {
    normalized: { inputOperation, operation, coreOperation, task },
    issues: [],
  };
}

function checkTask(core: DPCOCore, raw: Record<string, unknown>): TaskCheck {
  let byteLength: number;
  try {
    byteLength = Buffer.byteLength(JSON.stringify(raw), 'utf8');
  } catch {
    return {
      normalized: null,
      issues: ['task must contain only JSON-serializable values'],
      compatibleExecutors: [],
      executionEligible: false,
      blockedReason: 'INVALID_TASK',
    };
  }
  if (byteLength > MAX_TASK_BYTES) {
    return {
      normalized: null,
      issues: [`task exceeds the ${MAX_TASK_BYTES}-byte MCP request limit`],
      compatibleExecutors: [],
      executionEligible: false,
      blockedReason: 'REQUEST_TOO_LARGE',
    };
  }

  const { normalized, issues } = normalizeTask(raw);
  if (!normalized) {
    return {
      normalized: null,
      issues,
      compatibleExecutors: [],
      executionEligible: false,
      blockedReason: 'INVALID_TASK',
    };
  }

  const [valid, reason] = core.validator.validate(normalized.task);
  if (!valid) {
    return {
      normalized,
      issues: [reason],
      compatibleExecutors: [],
      executionEligible: false,
      blockedReason: reason,
    };
  }

  const [hasContradiction, contradictionReason] = core.gate.check(normalized.task);
  const compatibleExecutors = hasContradiction ? [] : core.registry.getCandidates(normalized.task);
  const blockedReason = hasContradiction
    ? contradictionReason
    : compatibleExecutors.length === 0
      ? getAdmissionReason(core, normalized.task)
      : null;

  return {
    normalized,
    issues: [],
    compatibleExecutors,
    executionEligible: compatibleExecutors.length > 0 && !hasContradiction,
    blockedReason,
  };
}

function getAdmissionReason(core: DPCOCore, task: Task): string {
  const registrations = core.registry.getAllExecutors()
    .filter((executor) => executor.capabilities.includes(task.operation));
  if (registrations.length === 0) return 'CAPABILITY_GAP';
  return registrations
    .map(({ id }) => core.registry.isCompatible(task, id)[1])
    .find((reason) => reason.length > 0) ?? 'No compatible admitted executor';
}

function capabilityFor(core: DPCOCore, capability: OperationCapability) {
  const coreOperation = capability.id === MULTIVAR_OPERATION
    ? CORE_SYSTEM_OPERATION
    : capability.id;
  const executors = core.registry.getAllExecutors()
    .filter((executor) =>
      executor.capabilities.includes(coreOperation) &&
      executor.props.declared_role !== 'NEGATIVE_CONTROL'
    );

  return {
    operation: capability.id,
    coreOperation,
    summary: capability.summary,
    paramsSummary: capability.params_summary,
    implementationStatus: capability.implementation_status,
    registeredExecutors: executors.map(({ id }) => id),
    executorRoles: executors.map(({ id, props }) => ({
      executorId: id,
      effectiveRole: props.effective_role ?? 'UNCLASSIFIED',
    })),
    productionAdmissionRequired: true as const,
  };
}

function toolResult<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

export function createDpcoMcpServer(core: DPCOCore): McpServer {
  const server = new McpServer(
    { name: 'dpco-v3-mcp', version: '3.0.0' },
    { maxToolInputElements: 10_000 }
  );

  server.registerTool('dpco_list_capabilities', {
    title: 'List DPCO capabilities',
    description: 'List manifest operations and their current in-process executor registrations. Registration does not imply production admission.',
    outputSchema: listCapabilitiesOutputSchema,
  }, async () => toolResult({
    manifestVersion: DPCO_CAPABILITY_MANIFEST.manifest_version,
    transport: 'stdio' as const,
    capabilities: DPCO_CAPABILITY_MANIFEST.operations.map((capability) => capabilityFor(core, capability)),
  }));

  server.registerTool('dpco_validate_task', {
    title: 'Validate DPCO task',
    description: 'Validate task fields and operation parameters, resolve the multivariable operation alias, and report current admitted dispatch candidates. This does not execute or grant admission.',
    inputSchema: taskToolInputSchema,
    outputSchema: validateTaskOutputSchema,
  }, async ({ task }) => {
    const checked = checkTask(core, task);
    const normalized = checked.normalized;
    return toolResult({
      valid: Boolean(normalized) && checked.issues.length === 0,
      operation: normalized?.operation ?? null,
      coreOperation: normalized?.coreOperation ?? null,
      issues: checked.issues,
      compatibleExecutors: checked.compatibleExecutors,
      executionEligible: checked.executionEligible,
      blockedReason: checked.blockedReason,
    });
  });

  server.registerTool('dpco_execute_task', {
    title: 'Execute DPCO task',
    description: 'Submit a production-mode task to DPCO Core. The adapter does not accept executor overrides or diagnostic-mode requests and never creates admission grants or evidence.',
    inputSchema: taskToolInputSchema,
    outputSchema: executeTaskOutputSchema,
  }, async ({ task }) => {
    const checked = checkTask(core, task);
    const normalized = checked.normalized;
    if (!normalized || checked.issues.length > 0) {
      return toolResult({
        status: 'REJECTED' as const,
        taskId: typeof task.id === 'string' ? task.id : null,
        operation: typeof task.operation === 'string' ? task.operation : null,
        coreOperation: normalized?.coreOperation ?? null,
        executionStatus: null,
        claimVerdict: null,
        verificationStatus: null,
        reason: checked.blockedReason,
        executor: null,
        grantId: null,
        evidenceIds: [],
        recordHash: null,
        result: null,
        steps: [],
        issues: checked.issues,
      });
    }

    try {
      const { log, steps } = core.processTask(normalized.task);
      const extendedLog = log as LedgerRecord & {
        systemSolution?: Record<string, string | number> | null;
      };
      return toolResult({
        status: log.final_executionStatus,
        taskId: log.task_id,
        operation: normalized.operation,
        coreOperation: normalized.coreOperation,
        executionStatus: log.final_executionStatus,
        claimVerdict: log.final_claimVerdict,
        verificationStatus: log.final_verificationStatus,
        reason: log.reason,
        executor: log.executor ?? null,
        grantId: log.grant_id ?? null,
        evidenceIds: log.evidence_ids_used ?? [],
        recordHash: log.record_hash ?? null,
        result: {
          root: log.executor_root ?? null,
          systemSolution: extendedLog.systemSolution ?? null,
          geometry: log.geometry_result ?? null,
        },
        steps: steps.map((step) => ({
          step: step.step,
          name: step.name,
          passed: step.passed,
          blocked: step.blocked ?? false,
          details: step.details,
          timestamp: step.timestamp,
        })),
        issues: [],
      });
    } catch (error) {
      process.stderr.write(
        `DPCO MCP Core processing error (${error instanceof Error ? error.name : 'unknown error'})\n`
      );
      return toolResult({
        status: 'ERROR' as const,
        taskId: normalized.task.id,
        operation: normalized.operation,
        coreOperation: normalized.coreOperation,
        executionStatus: null,
        claimVerdict: null,
        verificationStatus: null,
        reason: 'Unexpected DPCO Core runtime error; no result was returned',
        executor: null,
        grantId: null,
        evidenceIds: [],
        recordHash: null,
        result: null,
        steps: [],
        issues: ['Core processing failed before a ledger result was returned'],
      });
    }
  });

  server.registerTool('dpco_get_result', {
    title: 'Get DPCO result',
    description: 'Look up the most recent ledger record for a task ID in this server process.',
    inputSchema: resultToolInputSchema,
    outputSchema: getResultOutputSchema,
  }, async ({ taskId }) => {
    const record = core.ledger.getRecords()
      .filter((entry) => entry.task_id === taskId)
      .at(-1) ?? null;
    return toolResult({
      found: record !== null,
      taskId,
      record: record
        ? ledgerRecordOutputSchema.parse(record) as Record<string, unknown>
        : null,
    });
  });

  return server;
}

export function createDefaultMcpCore(): DPCOCore {
  const core = new DPCOCore();
  core.enableSystemSolver();
  core.enableMultiVarSolver();
  return core;
}
