/**
 * Assertion-based multi-var suite — Pass 3
 * Meaningful expected results only. No tautologies. No false-positive soft passes.
 * Exit 1 on any failure.
 */
import { DPCOCore } from '../src/core/dpcoCore';
import { MultiVarLinearExecutor } from '../src/core/executors';
import { verifyLinearSolutionByResidual } from '../src/core/multiVarVerify';
import { ExecStatus, VerifyStatus } from '../src/core/models';
import { getRuntimeAvailability } from '../src/core/capabilityManifest';
import { Fraction } from '../src/core/fraction';
import { EvidenceRegistry } from '../src/core/evidence';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string | null) {
  if (cond) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('================================================================');
console.log('  GROK PASS 3 — Multi-Var Acceptance Suite');
console.log('================================================================\n');

const core = new DPCOCore();
const exec = new MultiVarLinearExecutor();

// --- A. Unique solution ---
console.log('A. Unique solution');
{
  const matrix = [[1, 1], [1, -1]];
  const rhs = [5, 1];
  const r = exec.execute({ id: 'a', operation: 'solve_system', params: { matrix, rhs } } as any);
  assert(!!r.systemSolution, 'A1 has systemSolution');
  assert(r.systemSolution?.x0 === '3' && r.systemSolution?.x1 === '2', 'A2 coords (3,2)', JSON.stringify(r.systemSolution));
  const v = verifyLinearSolutionByResidual(matrix, rhs, r.systemSolution as any);
  assert(v.verified && v.status === 'SOLUTION_SATISFIES_SYSTEM', 'A3 residual satisfies system');
  assert(v.proves_uniqueness === false, 'A4 residual does NOT claim uniqueness');
}

// --- B. Overdetermined consistent ---
console.log('\nB. Overdetermined consistent');
{
  const matrix = [[1, 0], [0, 1], [1, 1]];
  const rhs = [3, 2, 5];
  const r = exec.execute({ id: 'b', operation: 'solve_system', params: { matrix, rhs } } as any);
  assert(r.systemSolution?.x0 === '3' && r.systemSolution?.x1 === '2', 'B1 coords', JSON.stringify(r.systemSolution));
  const v = verifyLinearSolutionByResidual(matrix, rhs, r.systemSolution as any);
  assert(v.verified && v.status === 'SOLUTION_SATISFIES_SYSTEM', 'B2 residual');
}

// --- C. Inconsistent ---
console.log('\nC. Inconsistent');
{
  const r = exec.execute({ id: 'c', operation: 'solve_system', params: { matrix: [[1, 1], [2, 2]], rhs: [3, 7] } } as any);
  assert(!!r.error && r.error.includes('INCONSISTENT'), 'C1', r.error);
}

// --- D. Underdetermined ---
console.log('\nD. Underdetermined');
{
  const r = exec.execute({ id: 'd', operation: 'solve_system', params: { matrix: [[1, 1]], rhs: [5] } } as any);
  assert(!!r.error && r.error.includes('UNDERDETERMINED'), 'D1', r.error);
}

// --- E. Zero-column matrix ---
console.log('\nE. Zero-column matrix');
{
  const r = exec.execute({
    id: 'e',
    operation: 'solve_system',
    params: { matrix: [[], []], rhs: [0, 0] },
  } as any);
  assert(!!r.error && (r.error.includes('ZERO_COLUMN') || r.error.includes('INVALID_INPUT')), 'E1 zero-column rejected', r.error);
  const v = verifyLinearSolutionByResidual([[], []], [0, 0], {});
  assert(!v.verified, 'E2 residual also rejects zero-column');
}

// --- F. Empty matrix ---
console.log('\nF. Empty matrix');
{
  const r = exec.execute({ id: 'f', operation: 'solve_system', params: { matrix: [], rhs: [] } } as any);
  assert(!!r.error, 'F1 empty rejected', r.error);
}

// --- G. Negatives ---
console.log('\nG. Negative coefficients');
{
  const matrix = [[-2, 1], [1, -3]];
  const rhs = [-1, -5];
  const r = exec.execute({ id: 'g', operation: 'solve_system', params: { matrix, rhs } } as any);
  assert(!!r.systemSolution, 'G1 solved', r.error);
  const v = verifyLinearSolutionByResidual(matrix, rhs, r.systemSolution as any);
  assert(v.verified, 'G2 residual', v.details);
}

// --- H. Fractional coefficients (strict expected residual) ---
console.log('\nH. Fractional coefficients');
{
  // (1/2)x + (1/3)y = 1 ; (1/4)x + (1/5)y = 9/20
  // Solution: x=1, y=3/2? Let us use a known system:
  // x/2 + y/3 = 1  => 3x + 2y = 6
  // x/4 + y/6 = 1/2 => 3x + 2y = 6  (same) underdetermined — bad
  // Better: x + y = 1 ; x/2 + y/3 = 1/2  => x=1/2? 
  // 1/2 + 1/2 = 1 ok; (1/2)/2 + (1/2)/3 = 1/4 + 1/6 = 5/12 ≠ 1/2. Wrong.
  // Solve: x+y=5, x/2 - y/3 = 1  => known path via integers first
  const matrix = [['1', '1'], ['1/2', '-1/3']];
  const rhs = ['5', '1'];
  const r = exec.execute({ id: 'h', operation: 'solve_system', params: { matrix, rhs } } as any);
  assert(!!r.systemSolution, 'H1 must solve fractions', r.error);
  const v = verifyLinearSolutionByResidual(matrix, rhs, r.systemSolution as any);
  assert(v.verified && v.status === 'SOLUTION_SATISFIES_SYSTEM', 'H2 residual exact', v.details + ' sol=' + JSON.stringify(r.systemSolution));
}

// --- I. Large BigInt (strict success required) ---
console.log('\nI. Large BigInt');
{
  const big = (10n ** 20n).toString();
  // x + y = big+3 ; x - y = big-1  => x = big+1, y = 2
  const matrix = [[1, 1], [1, -1]];
  const rhs = [(10n ** 20n + 3n).toString(), (10n ** 20n - 1n).toString()];
  const r = exec.execute({ id: 'i', operation: 'solve_system', params: { matrix, rhs } } as any);
  assert(!!r.systemSolution, 'I1 must succeed', r.error);
  const v = verifyLinearSolutionByResidual(matrix, rhs, r.systemSolution as any);
  assert(v.verified, 'I2 residual', v.details);
}

// --- I2. Scientific notation ---
console.log('\nI2. Scientific notation');
{
  assert(Fraction.from(1e-7).toString() === '1/10000000', 'I2a small finite number');
  assert(Fraction.from('1e-7').toString() === '1/10000000', 'I2b scientific string');
  assert(Fraction.from('-1.25e2').toString() === '-125', 'I2c signed exponent');
}

// --- J. Incomplete / extra ---
console.log('\nJ. Incomplete and extra vectors');
{
  const matrix = [[1, 0], [0, 1]];
  const rhs = [3, 4];
  assert(verifyLinearSolutionByResidual(matrix, rhs, { x0: '3' } as any).status === 'INCOMPLETE_SOLUTION', 'J1 missing');
  assert(verifyLinearSolutionByResidual(matrix, rhs, { x0: '3', x1: '4', x2: '0' } as any).status === 'EXTRA_COORDINATES', 'J2 extra');
  assert(verifyLinearSolutionByResidual(matrix, rhs, { x0: '0', x1: '0' } as any).status === 'RESIDUAL_NONZERO', 'J3 wrong');
}

// --- K. Residual does not claim uniqueness on underdetermined input ---
console.log('\nK. Residual epistemic bound');
{
  // Even if someone fabricates a particular solution for underdetermined system,
  // residual may pass but must NOT claim uniqueness.
  const matrix = [[1, 1]];
  const rhs = [5];
  // particular: x0=2, x1=3
  const v = verifyLinearSolutionByResidual(matrix, rhs, { x0: '2', x1: '3' } as any);
  assert(v.verified && v.status === 'SOLUTION_SATISFIES_SYSTEM', 'K1 particular solution satisfies');
  assert(v.proves_uniqueness === false, 'K2 does not claim uniqueness');
}

// --- L. Runtime availability ---
console.log('\nL. Runtime availability');
{
  assert(getRuntimeAvailability('solve_system_multivar', false) === 'IMPLEMENTED_BUT_DISABLED', 'L1 disabled before enable');
  assert(getRuntimeAvailability('solve_system_multivar', true) === 'IMPLEMENTED', 'L2 implemented after enable flag');
  assert(getRuntimeAvailability('solve_linear', false) === 'AVAILABLE', 'L3 solve_linear available');
}

// --- M. Qualification: no automatic PRODUCTION ---
console.log('\nM. Qualification integrity');
{
  core.enableMultiVarSolver();
  const role = core.registry.getEffectiveRole('multivar_linear_solver');
  assert(role === 'UNCLASSIFIED', 'M1 effective role is UNCLASSIFIED (no auto PRODUCTION)', 'role=' + role);
}

// --- N. processTask BLOCKED without grant (production mode) ---
console.log('\nN. processTask blocked without PRODUCTION grant');
{
  const res = core.processTask({
    id: 'n1',
    operation: 'solve_system',
    params: { matrix: [[1, 1], [1, -1]], rhs: [5, 1] },
    constraints: { exact: true },
    execution_mode: 'PRODUCTION',
  } as any);
  assert(
    res.log.final_executionStatus === ExecStatus.BLOCKED,
    'N1 PRODUCTION mode BLOCKED without grant',
    `${res.log.final_executionStatus} reason=${res.log.reason}`
  );
}

// --- O. Evidence must not self-attest on init ---
console.log('\nO. No self-attested TEST_SUITE_PASSED for multivar on init');
{
  const ev = core.registry.evidenceRegistry.getEvidence('EVID-MULTIVAR-TESTED');
  assert(!ev, 'O1 EVID-MULTIVAR-TESTED absent after init', ev ? 'still present' : 'ok');
  const freshCore = new DPCOCore();
  assert(
    freshCore.registry.evidenceRegistry.getAllGrants().length === 0,
    'O2 no automatic admission grants on init'
  );
  assert(
    freshCore.registry.evidenceRegistry.getExecutorEvidences('exact_solver').length === 0,
    'O3 no synthetic built-in test evidence on init'
  );
}

// --- P. Evidence provenance bindings ---
console.log('\nP. Evidence provenance bindings');
{
  const registry = new EvidenceRegistry();
  const base = {
    executor_id: 'multivar_linear_solver',
    domain: 'arithmetic.rational.system',
    test_profile_id: 'multivar-suite-v1',
    source_revision: 'v3-local-validation',
    environment: 'node20/linux-x64',
    passed: true,
    total_checks: 31,
    failed_checks: 0,
    executed_at: new Date().toISOString(),
    harness_id: 'harness:grok_edition_pass3' as const,
  };
  const accepted = registry.ingestTestResult(base);
  const evidence = accepted.evidence_id ? registry.getEvidence(accepted.evidence_id) : undefined;
  assert(accepted.accepted, 'P1 bound passing profile accepted');
  assert(
    evidence?.metadata?.source_revision === base.source_revision &&
      evidence.metadata.environment === base.environment &&
      evidence.metadata.test_profile_id === base.test_profile_id,
    'P2 revision, environment, and profile recorded',
    JSON.stringify(evidence?.metadata)
  );
  assert(
    !registry.ingestTestResult({ ...base, environment: '' }).accepted,
    'P3 missing environment rejected'
  );
  assert(
    !registry.ingestTestResult({ ...base, total_checks: 0 }).accepted,
    'P4 empty test profile rejected'
  );
  assert(
    !registry.ingestTestResult({ ...base, failed_checks: -1 }).accepted,
    'P5 invalid failed count rejected'
  );
  assert(
    !registry.ingestTestResult({ ...base, harness_id: 'harness:unknown' }).accepted,
    'P6 unlisted harness rejected'
  );
}

console.log('\n================================================================');
console.log(`  RESULT: ${passed} PASS / ${failed} FAIL`);
console.log('================================================================');
if (failed > 0) process.exit(1);
