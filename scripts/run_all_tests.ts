import { DPCOCore } from '../src/core/dpcoCore';
import { runFullVerificationSuite } from '../src/core/testSuite';
import { runCspTestSuite } from '../src/core/cspTestSuite';
import { runRevision4TestSuite } from '../src/core/revision4TestSuite';
import { prepareAcceptanceTestAdmission } from './testSupport';

console.log('================================================================');
console.log('    DPCO TRIPLE TEST RUNNER: CORE (19) + CSP (10) + R4 (25)     ');
console.log('================================================================\n');

const core = new DPCOCore();
if (
  core.registry.evidenceRegistry.getAllGrants().length !== 0 ||
  ['exact_solver', 'num_solver', 'geometry_solver', 'test_bad_solver', 'bad_geometry_solver']
    .some((executorId) => core.registry.evidenceRegistry.getExecutorEvidences(executorId).length !== 0)
) {
  throw new Error('DPCO core unexpectedly created admission grants or evidence before test setup.');
}
const preflightProfiles = prepareAcceptanceTestAdmission(core);
console.log(`Test-only admission: ${preflightProfiles} direct executor profiles passed and were explicitly granted.\n`);

// 1. Run Baseline DPCO Core 19 Tests
console.log('--- 1. RUNNING DPCO CORE VERIFICATION MATRIX (19 CHECKS) ---');
const coreSuite = runFullVerificationSuite(core);
for (const r of coreSuite.results) {
  const badge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${badge} ${r.id.padEnd(6)}: ${r.name} (${r.durationMs}ms)`);
  if (!r.passed) {
    console.error(`       Expected: ${r.expectedStatus.join('/')}, Got: ${r.actualStatus.join('/')}`);
    if (r.error) console.error(`       Error: ${r.error}`);
  }
}
console.log(`\nCORE SUMMARY: ${coreSuite.passCount} PASS / ${coreSuite.failCount} FAIL (${coreSuite.totalDurationMs}ms)\n`);

// 2. Run CSP-0.2 Validator 10 Tests
console.log('--- 2. RUNNING CSP-0.2 INTEGRATION MATRIX (10 CHECKS) ---');
const cspSuite = runCspTestSuite(core);
for (const r of cspSuite.results) {
  const badge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${badge} ${r.id.padEnd(8)}: ${r.name} (${r.durationMs}ms)`);
  if (!r.passed) {
    console.error(`       Expected: ${r.expected}`);
    console.error(`       Actual:   ${r.actual}`);
  }
}
console.log(`\nCSP SUMMARY:  ${cspSuite.passCount} PASS / ${cspSuite.failCount} FAIL (${cspSuite.totalDurationMs}ms)\n`);

// 3. Run DPCO v0.2.0 Revision 4 Architecture Acceptance Suite (25 Checks)
console.log('--- 3. RUNNING REVISION 4 ACCEPTANCE MATRIX (25 CHECKS) ---');
const r4Suite = runRevision4TestSuite(core);
let currentGroup = '';
for (const r of r4Suite.results) {
  if (r.group !== currentGroup) {
    currentGroup = r.group;
    console.log(`\n  [${currentGroup}]`);
  }
  const badge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`  ${badge} ${r.id.padEnd(8)}: ${r.name} (${r.durationMs}ms)`);
  if (!r.passed) {
    console.error(`         Expected: ${r.expected}`);
    console.error(`         Actual:   ${r.actual}`);
  }
}
console.log(`\nR4 SUMMARY:   ${r4Suite.passCount} PASS / ${r4Suite.failCount} FAIL (${r4Suite.totalDurationMs}ms)\n`);

console.log('================================================================');
const totalPass = coreSuite.passCount + cspSuite.passCount + r4Suite.passCount;
const totalFail = coreSuite.failCount + cspSuite.failCount + r4Suite.failCount;
console.log(`OVERALL REVISION 4 SUITE: ${totalPass} PASS / ${totalFail} FAIL`);
console.log('================================================================');

if (totalFail > 0) {
  process.exit(1);
}
