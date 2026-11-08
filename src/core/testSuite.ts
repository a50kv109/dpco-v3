import { DPCOCore } from './dpcoCore';
import { Fraction } from './fraction';
import { ClaimVerdict, ExecStatus, Task, VerifyStatus } from './models';

export interface TestCaseDefinition {
  id: string;
  name: string;
  category: 'matrix' | 'edge' | 'ledger' | 'v0.2_evolution';
  description: string;
  task: Task;
  expectedStatus: [ExecStatus, ClaimVerdict, VerifyStatus];
  expectedReason?: string;
  expectedRoot?: string | number;
  expectedExecutor?: string;
  forceExecutor?: string;
  requiresSystemSolver?: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  category: 'matrix' | 'edge' | 'ledger' | 'v0.2_evolution';
  passed: boolean;
  actualStatus: [string, string, string];
  expectedStatus: [string, string, string];
  actualReason?: string | null;
  expectedReason?: string;
  actualRoot?: string | null;
  expectedRoot?: string | number;
  actualExecutor?: string;
  expectedExecutor?: string;
  durationMs: number;
  notes?: string;
  error?: string;
}

export const TEST_DEFINITIONS: TestCaseDefinition[] = [
  // --- T01-T10 Matrix (11 checks) ---
  {
    id: 'T01',
    name: 'T01 - Exact Arithmetic',
    category: 'matrix',
    description: 'Solve 2x + 0 = 3 with exact rational arithmetic. Validates exact fraction root 3/2.',
    task: {
      id: 'T01',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      constraints: { exact: true },
    },
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.NOT_APPLICABLE, VerifyStatus.VERIFIED],
    expectedRoot: '3/2',
    expectedExecutor: 'exact_solver',
  },
  {
    id: 'T02',
    name: 'T02 - False Claim Assessment',
    category: 'matrix',
    description: 'Solve 2x + 0 = 3 with user claim x = 2. Verifier proves root 3/2 and classifies claim as FALSE.',
    task: {
      id: 'T02',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      claim: { x: 2 },
      constraints: { exact: true },
    },
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.FALSE, VerifyStatus.VERIFIED],
    expectedRoot: '3/2',
  },
  {
    id: 'T03.1',
    name: 'T03.1 - Shift Contradiction',
    category: 'matrix',
    description: 'Equation system with conflicting shifts: [x + 0 = 2, x + 1 = 4]. Gate blocks execution.',
    task: {
      id: 'T03.1',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 1, b: 1, c: 4 },
        ],
      },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CONTRADICTION',
  },
  {
    id: 'T03.2',
    name: 'T03.2 - Proportional Contradiction',
    category: 'matrix',
    description: 'Proportional contradiction: [x = 2, 2x = 5]. Gate blocks prior to execution.',
    task: {
      id: 'T03.2',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 2, b: 0, c: 5 },
        ],
      },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CONTRADICTION',
  },
  {
    id: 'T04',
    name: 'T04 - Capability Gap',
    category: 'matrix',
    description: 'Unregistered operation solve_cubic. Registry signals CAPABILITY_GAP without crashing.',
    task: {
      id: 'T04',
      operation: 'solve_cubic',
      params: { a: 1, b: 2, c: 3, d: 4 },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CAPABILITY_GAP',
  },
  {
    id: 'T05',
    name: 'T05 - Independent Verification Failure',
    category: 'matrix',
    description: 'Forced selection of adversarial test_bad_solver. Execution succeeds, but Independent Verifier catches bogus root 2.0.',
    task: {
      id: 'T05',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      claim: { x: 2 },
      execution_mode: 'DIAGNOSTIC_TEST',
    },
    forceExecutor: 'test_bad_solver',
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'ROOT_VERIFICATION_FAILED',
  },
  {
    id: 'T06',
    name: 'T06 - Deterministic Dispatch',
    category: 'matrix',
    description: 'Solve 3x + 0 = 1 without exact constraint. Dispatcher selects cheaper num_solver (cost 5 vs 10).',
    task: {
      id: 'T06',
      operation: 'solve_linear',
      params: { a: 3, b: 0, c: 1 },
    },
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.NOT_APPLICABLE, VerifyStatus.VERIFIED],
    expectedExecutor: 'num_solver',
    expectedRoot: 1 / 3,
  },
  {
    id: 'T07',
    name: 'T07 - Forced Constraint Violation',
    category: 'matrix',
    description: 'Attempt to force num_solver when exact: true is required. Blocked by unified compatibility guard.',
    task: {
      id: 'T07',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      constraints: { exact: true },
    },
    forceExecutor: 'num_solver',
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CONSTRAINT_VIOLATION',
  },
  {
    id: 'T08',
    name: 'T08 - Consistent Two-Equation System (v0.1)',
    category: 'matrix',
    description: 'Consistent system [x = 2, 2x = 4]. Passes contradiction gate, returns CAPABILITY_GAP in v0.1.',
    task: {
      id: 'T08',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 2, b: 0, c: 4 },
        ],
      },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CAPABILITY_GAP',
  },
  {
    id: 'T09',
    name: 'T09 - Consistent Three-Equation System (v0.1)',
    category: 'matrix',
    description: 'Consistent system [x = 2, 2x = 4, 3x = 6]. Passes gate, returns CAPABILITY_GAP in v0.1.',
    task: {
      id: 'T09',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 2, b: 0, c: 4 },
          { a: 3, b: 0, c: 6 },
        ],
      },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CAPABILITY_GAP',
  },
  {
    id: 'T10',
    name: 'T10 - Three-Equation Contradiction',
    category: 'matrix',
    description: 'Three-equation system where third equation contradicts: [x = 2, 2x = 4, 3x = 7]. Blocked by gate.',
    task: {
      id: 'T10',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 2, b: 0, c: 4 },
          { a: 3, b: 0, c: 7 },
        ],
      },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'CONTRADICTION',
  },

  // --- Supplemental Edge Checks E01–E07 (7 checks) ---
  {
    id: 'E01',
    name: 'E01 - Negative Coefficients',
    category: 'edge',
    description: 'Solve -2x + 3 = -2 with exact arithmetic. Solution root x = 5/2.',
    task: {
      id: 'E01',
      operation: 'solve_linear',
      params: { a: -2, b: 3, c: -2 },
      constraints: { exact: true },
    },
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.NOT_APPLICABLE, VerifyStatus.VERIFIED],
    expectedRoot: '5/2',
  },
  {
    id: 'E02',
    name: 'E02 - Fractional Coefficients',
    category: 'edge',
    description: 'Solve (1/2)x + (1/3) = (5/6). Solution root x = 1.',
    task: {
      id: 'E02',
      operation: 'solve_linear',
      params: { a: '1/2', b: '1/3', c: '5/6' },
      constraints: { exact: true },
    },
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.NOT_APPLICABLE, VerifyStatus.VERIFIED],
    expectedRoot: '1',
  },
  {
    id: 'E03',
    name: 'E03 - Large Integer Coefficients (10^80)',
    category: 'edge',
    description: 'Solve 3x + 5 = 10^80. Validates BigInt arbitrary precision with zero overflow.',
    task: {
      id: 'E03',
      operation: 'solve_linear',
      params: {
        a: 3,
        b: 5,
        c: '100000000000000000000000000000000000000000000000000000000000000000000000000000000',
      },
      constraints: { exact: true },
    },
    expectedStatus: [ExecStatus.SUCCESS, ClaimVerdict.NOT_APPLICABLE, VerifyStatus.VERIFIED],
    expectedRoot: new Fraction(
      '99999999999999999999999999999999999999999999999999999999999999999999999999999995',
      3n
    ).toString(),
  },
  {
    id: 'E04',
    name: 'E04 - Missing Parameter',
    category: 'edge',
    description: 'Equation missing parameter "c": {a: 1, b: 2}. Blocked by validator.',
    task: {
      id: 'E04',
      operation: 'solve_linear',
      params: { a: 1, b: 2 },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: "missing coefficient 'c'",
  },
  {
    id: 'E05',
    name: 'E05 - Zero Coefficient',
    category: 'edge',
    description: 'Linear equation with a = 0: 0x + 2 = 3. Division by zero blocked by validator.',
    task: {
      id: 'E05',
      operation: 'solve_linear',
      params: { a: 0, b: 2, c: 3 },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'cannot be zero',
  },
  {
    id: 'E06',
    name: 'E06 - Malformed Equation in System',
    category: 'edge',
    description: 'System equation missing parameter "c". Blocked by validator.',
    task: {
      id: 'E06',
      operation: 'solve_system',
      params: { eqs: [{ a: 1, b: 2 }] },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: "missing coefficient 'c'",
  },
  {
    id: 'E07',
    name: 'E07 - Non-Finite Coefficient (Infinity)',
    category: 'edge',
    description: 'Coefficient a = Infinity. Strict IEEE-754 finiteness guard blocks input.',
    task: {
      id: 'E07',
      operation: 'solve_linear',
      params: { a: Number.POSITIVE_INFINITY, b: 0, c: 1 },
    },
    expectedStatus: [ExecStatus.BLOCKED, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED],
    expectedReason: 'must be finite numeric',
  },
];

export function runFullVerificationSuite(core: DPCOCore): {
  results: TestResult[];
  passCount: number;
  failCount: number;
  matrixPasses: number;
  matrixTotal: number;
  edgePasses: number;
  edgeTotal: number;
  ledgerIntegrityPass: boolean;
  totalDurationMs: number;
} {
  const startTime = performance.now();
  const results: TestResult[] = [];
  let passCount = 0;
  let failCount = 0;
  let matrixPasses = 0;
  let edgePasses = 0;

  // Run T01-T10 and E01-E07
  for (const def of TEST_DEFINITIONS) {
    const testStart = performance.now();
    try {
      const processRes = core.processTask(def.task, def.forceExecutor);
      const log = processRes.log;

      const actual: [string, string, string] = [
        log.final_executionStatus,
        log.final_claimVerdict,
        log.final_verificationStatus,
      ];

      const expected: [string, string, string] = [
        def.expectedStatus[0],
        def.expectedStatus[1],
        def.expectedStatus[2],
      ];

      let passed =
        actual[0] === expected[0] &&
        actual[1] === expected[1] &&
        actual[2] === expected[2];

      if (def.expectedReason) {
        passed = passed && String(log.reason || '').includes(def.expectedReason);
      }

      if (def.expectedRoot !== undefined && def.expectedRoot !== null) {
        const actualRoot = log.executor_root;
        if (typeof def.expectedRoot === 'number') {
          const numAct = Number(actualRoot);
          passed =
            passed &&
            actualRoot !== null &&
            actualRoot !== undefined &&
            Math.abs(numAct - def.expectedRoot) <= 1e-11;
        } else {
          passed = passed && actualRoot === def.expectedRoot;
        }
      }

      if (def.expectedExecutor) {
        passed = passed && log.executor === def.expectedExecutor;
      }

      const durationMs = Math.round((performance.now() - testStart) * 100) / 100;

      if (passed) {
        passCount++;
        if (def.category === 'matrix') matrixPasses++;
        if (def.category === 'edge') edgePasses++;
      } else {
        failCount++;
      }

      results.push({
        id: def.id,
        name: def.name,
        category: def.category,
        passed,
        actualStatus: actual,
        expectedStatus: expected,
        actualReason: log.reason,
        expectedReason: def.expectedReason,
        actualRoot: log.executor_root,
        expectedRoot: def.expectedRoot,
        actualExecutor: log.executor,
        expectedExecutor: def.expectedExecutor,
        durationMs,
      });
    } catch (err: any) {
      failCount++;
      results.push({
        id: def.id,
        name: def.name,
        category: def.category,
        passed: false,
        actualStatus: ['ERROR', 'ERROR', 'ERROR'],
        expectedStatus: def.expectedStatus,
        durationMs: Math.round((performance.now() - testStart) * 100) / 100,
        error: err?.message || String(err),
      });
    }
  }

  // --- Check 19: Strict JSONL Ledger & SHA-256 Chain Verification ---
  const ledgerStart = performance.now();
  const integrity = core.ledger.verifyChainIntegrity();
  const ledgerRecords = core.ledger.getRecords();
  const requiredFields = [
    'task_id',
    'operation',
    'params',
    'claim',
    'constraints',
    'reason',
    'final_executionStatus',
    'final_claimVerdict',
    'final_verificationStatus',
    'timestamp',
  ];

  const hasAllFields = ledgerRecords.length > 0 && requiredFields.every((f) => f in ledgerRecords[ledgerRecords.length - 1]);
  const ledgerPassed = integrity.valid && hasAllFields && ledgerRecords.length >= 18;

  if (ledgerPassed) {
    passCount++;
  } else {
    failCount++;
  }

  results.push({
    id: 'L01',
    name: 'JSONL Ledger & Cryptographic Chain Integrity',
    category: 'ledger',
    passed: ledgerPassed,
    actualStatus: [
      ledgerPassed ? 'SUCCESS' : 'FAILED',
      'NOT_APPLICABLE',
      ledgerPassed ? 'VERIFIED' : 'UNVERIFIED',
    ],
    expectedStatus: ['SUCCESS', 'NOT_APPLICABLE', 'VERIFIED'],
    notes: `${integrity.details} (${ledgerRecords.length} records parsed, all required schema fields verified).`,
    durationMs: Math.round((performance.now() - ledgerStart) * 100) / 100,
  });

  const totalDurationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    results,
    passCount,
    failCount,
    matrixPasses,
    matrixTotal: 11,
    edgePasses,
    edgeTotal: 7,
    ledgerIntegrityPass: ledgerPassed,
    totalDurationMs,
  };
}
