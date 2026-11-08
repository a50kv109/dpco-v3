import { z } from 'zod';
import { parseCircle, parseLine, parsePoint } from '../../core/geometry';

const numericInputSchema = z.union([
  z.number().finite(),
  z.string().min(1).max(128),
]);

const pointSchema = z.object({
  x: numericInputSchema,
  y: numericInputSchema,
}).strict();

const lineSchema = z.object({
  a: numericInputSchema,
  b: numericInputSchema,
  c: numericInputSchema.optional(),
}).strict();

const circleSchema = z.object({
  center: pointSchema,
  r: numericInputSchema.optional(),
  rSquared: numericInputSchema.optional(),
}).strict().refine((circle) => circle.r !== undefined || circle.rSquared !== undefined, {
  message: 'circle must provide r or rSquared',
});

const equationSchema = z.object({
  a: numericInputSchema,
  b: numericInputSchema,
  c: numericInputSchema,
}).strict();

const matrixSchema = z.array(
  z.array(numericInputSchema).min(1).max(32)
).min(1).max(32);

const operationSchemas = {
  solve_linear: z.object({
    a: numericInputSchema,
    b: numericInputSchema,
    c: numericInputSchema,
  }).strict(),
  solve_system: z.union([
    z.object({
      eqs: z.array(equationSchema).min(1).max(128),
    }).strict(),
    z.object({
      matrix: matrixSchema,
      rhs: z.array(numericInputSchema).min(1).max(32),
    }).strict(),
  ]),
  solve_system_multivar: z.object({
    matrix: matrixSchema,
    rhs: z.array(numericInputSchema).min(1).max(32),
  }).strict(),
  intersect_lines: z.object({
    l1: lineSchema,
    l2: lineSchema,
  }).strict(),
  verify_point_on_line: z.object({
    point: pointSchema,
    line: lineSchema,
  }).strict(),
  verify_point_on_circle: z.object({
    point: pointSchema,
    circle: circleSchema,
  }).strict(),
  verify_tangency: z.object({
    line: lineSchema,
    circle: circleSchema,
  }).strict(),
  intersect_line_circle: z.object({
    line: lineSchema,
    circle: circleSchema,
  }).strict(),
} as const;

export const operationIds = Object.keys(operationSchemas) as [
  keyof typeof operationSchemas,
  ...(keyof typeof operationSchemas)[],
];

const taskInputSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  operation: z.string().max(128).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  claim: z.record(z.string(), z.unknown()).nullable().optional(),
  constraints: z.object({
    exact: z.boolean().optional(),
    required_rigor: z.enum(['TESTED', 'INSTANCE_VERIFIED', 'DOMAIN_VERIFIED']).optional(),
    domain: z.string().max(256).optional(),
  }).strict().optional(),
}).passthrough();

export const taskToolInputSchema = z.object({
  task: taskInputSchema,
}).strict();

export const resultToolInputSchema = z.object({
  taskId: z.string().min(1).max(128),
}).strict();

export const listCapabilitiesOutputSchema = z.object({
  manifestVersion: z.string(),
  transport: z.literal('stdio'),
  capabilities: z.array(z.object({
    operation: z.string(),
    coreOperation: z.string(),
    summary: z.string(),
    paramsSummary: z.string(),
    implementationStatus: z.string(),
    registeredExecutors: z.array(z.string()),
    executorRoles: z.array(z.object({
      executorId: z.string(),
      effectiveRole: z.string(),
    })),
    productionAdmissionRequired: z.literal(true),
  }).strict()),
}).strict();

export const validateTaskOutputSchema = z.object({
  valid: z.boolean(),
  operation: z.string().nullable(),
  coreOperation: z.string().nullable(),
  issues: z.array(z.string()),
  compatibleExecutors: z.array(z.string()),
  executionEligible: z.boolean(),
  blockedReason: z.string().nullable(),
}).strict();

export const pipelineStepOutputSchema = z.object({
  step: z.enum([
    'validation',
    'contradiction_gate',
    'registry_dispatch',
    'execution',
    'independent_verification',
    'classifier',
    'ledger',
  ]),
  name: z.string(),
  passed: z.boolean(),
  blocked: z.boolean(),
  details: z.string(),
  timestamp: z.number(),
}).strict();

export const executeTaskOutputSchema = z.object({
  status: z.enum(['REJECTED', 'BLOCKED', 'FAILED', 'SUCCESS', 'ERROR']),
  taskId: z.string().nullable(),
  operation: z.string().nullable(),
  coreOperation: z.string().nullable(),
  executionStatus: z.string().nullable(),
  claimVerdict: z.string().nullable(),
  verificationStatus: z.string().nullable(),
  reason: z.string().nullable(),
  executor: z.string().nullable(),
  grantId: z.string().nullable(),
  evidenceIds: z.array(z.string()),
  recordHash: z.string().nullable(),
  result: z.object({
    root: z.string().nullable(),
    systemSolution: z.record(z.string(), z.union([z.string(), z.number()])).nullable(),
    geometry: z.unknown().nullable(),
  }).strict().nullable(),
  steps: z.array(pipelineStepOutputSchema),
  issues: z.array(z.string()),
}).strict();

export const ledgerRecordOutputSchema = z.object({
  task_id: z.string(),
  operation: z.string(),
  params: z.record(z.string(), z.unknown()),
  claim: z.record(z.string(), z.unknown()).nullable().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().nullable(),
  executor: z.string().optional(),
  executor_root: z.string().nullable().optional(),
  geometry_result: z.unknown().nullable().optional(),
  exec_time_ms: z.number().optional(),
  final_executionStatus: z.string(),
  final_claimVerdict: z.string(),
  final_verificationStatus: z.string(),
  timestamp: z.number(),
  grant_id: z.string().nullable().optional(),
  effective_role: z.string().nullable().optional(),
  evidence_ids_used: z.array(z.string()).optional(),
  historical_admission_revoked: z.boolean().optional(),
  revocation_event: z.string().optional(),
  isolation_tier: z.string().optional(),
  block_index: z.number().optional(),
  prev_hash: z.string().optional(),
  record_hash: z.string().optional(),
}).passthrough();

export const getResultOutputSchema = z.object({
  found: z.boolean(),
  taskId: z.string(),
  record: ledgerRecordOutputSchema.nullable(),
}).strict();

export const errorOutputSchema = z.object({
  error: z.string(),
}).strict();

export type OperationId = keyof typeof operationSchemas;

export function validateOperationParams(operation: OperationId, params: unknown): string[] {
  const parsed = operationSchemas[operation].safeParse(params);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    });
  }

  if (!isRecord(params)) return ['params must be a JSON object'];

  try {
    switch (operation) {
      case 'intersect_lines':
        parseLine(params.l1);
        parseLine(params.l2);
        break;
      case 'verify_point_on_line':
        parsePoint(params.point);
        parseLine(params.line);
        break;
      case 'verify_point_on_circle':
        parsePoint(params.point);
        parseCircle(params.circle);
        break;
      case 'verify_tangency':
      case 'intersect_line_circle':
        parseLine(params.line);
        parseCircle(params.circle);
        break;
      default:
        break;
    }
  } catch (error) {
    return [error instanceof Error ? error.message : 'Invalid geometric parameter'];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
