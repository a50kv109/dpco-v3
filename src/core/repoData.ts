/**
 * DPCO Repository Metadata, Architectural Specifications & Evolution Roadmap
 * Direct reference to https://github.com/a50kv109/dpco
 */

export interface RepoFileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  description: string;
  provenance: string;
}

export const REPO_METADATA = {
  name: 'dpco',
  owner: 'a50kv109',
  fullName: 'a50kv109/dpco',
  githubUrl: 'https://github.com/a50kv109/dpco',
  description: 'Deterministic Processing & Cognitive Orchestration — experimental engineering core',
  currentVersion: 'DPCO PoC v0.1 / Evolution v0.2',
  status: '19 PASS / 0 FAIL Verified Benchmark',
  principles: [
    {
      title: '1. Fact-Grounded Verification',
      desc: 'Статус проверки описывает фактически выполненную процедуру, а не предположения исполнителя.',
    },
    {
      title: '2. Execution ≠ Correctness',
      desc: 'Успешное выполнение не доказывает правильность результата (Success does not imply validity).',
    },
    {
      title: '3. Decoupled Claim Assessment',
      desc: 'Проверка корня отделена от независимой оценки пользовательского утверждения (Dual-stage verification).',
    },
    {
      title: '4. Unified Constraint Enforcement',
      desc: 'Ограничения проверяются единообразно как при обычном диспетчировании, так и при принудительном выборе (force_executor).',
    },
    {
      title: '5. Tamper-Evident Ledger Provenance',
      desc: 'Проверенные результаты, метрики и точные причины отказа фиксируются в защищенном журнале.',
    },
  ],
  statusDimensions: [
    {
      name: 'ExecStatus',
      values: ['SUCCESS', 'FAILED', 'BLOCKED'],
      description: 'Фактический технический исход выполнения: запуск состоялся успешно, завершился ошибкой или заблокирован на входе.',
    },
    {
      name: 'ClaimVerdict',
      values: ['TRUE', 'FALSE', 'UNKNOWN', 'NOT_APPLICABLE'],
      description: 'Соответствует ли проверяемая гипотеза пользователя независимо проверенному результату.',
    },
    {
      name: 'VerifyStatus',
      values: ['VERIFIED', 'UNVERIFIED', 'NOT_APPLICABLE'],
      description: 'Был ли результат подтвержден независимой математической подстановкой в исходное отношение.',
    },
  ],
  roadmap: [
    {
      phase: 'PoC v0.1 (Current)',
      title: 'Deterministic Core & Scalar Equation Baseline',
      status: 'Completed',
      items: [
        'Strict Constraint Validator (finiteness, non-zero a, structure)',
        'Pairwise Contradiction Gate for scalar equations',
        'Capability Registry & Deterministic Dispatcher (cost/id priority)',
        'ExactExecutor (Fraction) & NumericalExecutor (Float)',
        'Independent Verifier with dual root/claim assessment',
        'Strict JSONL Execution Ledger',
        '19/19 Test Benchmark Suite (11 Matrix + 7 Edge + 1 Ledger)',
      ],
    },
    {
      phase: 'Evolution v0.2 (Active Workbench)',
      title: 'Linear System Solver & Tamper-Evident Ledger',
      status: 'Active',
      items: [
        'LinearSystemExecutor: Fills CAPABILITY_GAP for consistent multi-equation systems',
        'SHA-256 Merkle Block Chaining on JSONL records with integrity validation',
        'Interactive Visual Pipeline Stepper with micro-timing & intermediate states',
        'Cognitive Natural Language Decomposer for human-to-task translation',
        'Dynamic Custom Executor Laboratory for testing user-defined routines',
      ],
    },
    {
      phase: 'Evolution v0.3 (Next Milestone)',
      title: 'Cognitive Multi-Agent Sandboxing & Symbolic Engine',
      status: 'Planned',
      items: [
        'Multi-variable polynomial & matrix equation capabilities',
        'Zero-knowledge proof validation receipts for offloaded tasks',
        'Distributed Byzantine-fault tolerant ledger replication',
        'Agentic self-healing strategies upon capability gap detection',
      ],
    },
  ],
  fileTree: [
    {
      name: 'Architecture/DPCO_ARCHITECTURE.md',
      path: 'Architecture/DPCO_ARCHITECTURE.md',
      type: 'file',
      description: 'Consolidated component, flow, status, and scope description',
      provenance: 'VS Code Agent consolidation',
    },
    {
      name: 'DPCO-PoC-v0.1/generate_and_run.py',
      path: 'DPCO-PoC-v0.1/generate_and_run.py',
      type: 'file',
      description: 'Reproducible project generator and syntax/import gate',
      provenance: 'VS Code Agent / Python 3.12',
    },
    {
      name: 'DPCO-PoC-v0.1/dpco-algebra-poc/src/core.py',
      path: 'DPCO-PoC-v0.1/dpco-algebra-poc/src/core.py',
      type: 'file',
      description: 'DPCO task orchestration coordinator',
      provenance: 'Core engine implementation',
    },
    {
      name: 'DPCO-PoC-v0.1/dpco-algebra-poc/src/contradiction.py',
      path: 'DPCO-PoC-v0.1/dpco-algebra-poc/src/contradiction.py',
      type: 'file',
      description: 'Pairwise cross-multiplication contradiction detection',
      provenance: 'Formal algebra gate',
    },
    {
      name: 'DPCO-PoC-v0.1/dpco-algebra-poc/src/verifier.py',
      path: 'DPCO-PoC-v0.1/dpco-algebra-poc/src/verifier.py',
      type: 'file',
      description: 'Independent back-substitution and claim assessment',
      provenance: 'Verification boundary',
    },
    {
      name: 'DPCO-PoC-v0.1/dpco-algebra-poc/tests.py',
      path: 'DPCO-PoC-v0.1/dpco-algebra-poc/tests.py',
      type: 'file',
      description: 'Official test suite: T01–T10, E01–E07, and ledger check',
      provenance: '19 PASS / 0 FAIL suite',
    },
    {
      name: 'Reports/ENGINEERING_AUDIT.md',
      path: 'Reports/ENGINEERING_AUDIT.md',
      type: 'file',
      description: 'Complete engineering audit, defects corrected, and verification matrix',
      provenance: 'Technical audit report',
    },
    {
      name: 'MANIFEST.md',
      path: 'MANIFEST.md',
      type: 'file',
      description: 'Inventory of files, provenance and status',
      provenance: 'Consolidation manifest',
    },
  ],
};

export const SAMPLE_TASKS = [
  {
    name: 'T01 - Exact Arithmetic (2x = 3)',
    task: {
      id: 'TASK-SAMPLE-01',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      constraints: { exact: true },
    },
    description: 'Requires exact rational arithmetic (returns 3/2 instead of 1.5).',
  },
  {
    name: 'T02 - False User Claim (2x = 3, claim x = 2)',
    task: {
      id: 'TASK-SAMPLE-02',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      claim: { x: 2 },
      constraints: { exact: true },
    },
    description: 'Execution succeeds, root 3/2 is verified, user claim x=2 is rejected as FALSE.',
  },
  {
    name: 'T03 - Shift Contradiction ([x = 2, x + 1 = 4])',
    task: {
      id: 'TASK-SAMPLE-03',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 1, b: 1, c: 4 },
        ],
      },
    },
    description: 'Contradiction gate blocks execution before wasting compute.',
  },
  {
    name: 'T05 - Adversarial Executor Stress Test',
    task: {
      id: 'TASK-SAMPLE-05',
      operation: 'solve_linear',
      params: { a: 2, b: 0, c: 3 },
      claim: { x: 2 },
    },
    forceExecutor: 'test_bad_solver',
    description: 'Forces bad executor returning fake x=2. Independent verifier catches discrepancy!',
  },
  {
    name: 'T08 - Consistent System ([x = 2, 2x = 4])',
    task: {
      id: 'TASK-SAMPLE-08',
      operation: 'solve_system',
      params: {
        eqs: [
          { a: 1, b: 0, c: 2 },
          { a: 2, b: 0, c: 4 },
        ],
      },
    },
    description: 'In v0.1: CAPABILITY_GAP. In v0.2: Solved by LinearSystemExecutor!',
  },
  {
    name: 'E03 - BigInt Extreme Precision (3x + 5 = 10^80)',
    task: {
      id: 'TASK-SAMPLE-E03',
      operation: 'solve_linear',
      params: {
        a: 3,
        b: 5,
        c: '100000000000000000000000000000000000000000000000000000000000000000000000000000000',
      },
      constraints: { exact: true },
    },
    description: 'Validates 80-digit arbitrary precision computation without precision loss.',
  },
];
