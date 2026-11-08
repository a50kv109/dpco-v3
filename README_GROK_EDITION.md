# DPCO v2 — Grok Independent Engineering Edition

Independent engineering fork of DPCO v2.

## Key additions
1. Machine-readable Capability Manifest (`src/core/capabilityManifest.ts`, `schemas/v1/`)
2. Exact multi-variable linear systems over ℚ with independent residual verification
3. Assessment and implementation reports in `docs/`

## Quick start
```bash
npx tsx scripts/run_all_tests.ts     # original 54 checks
npx tsx scripts/test_multivar.ts     # new multi-var tests
```

```ts
import { DPCOCore } from './src/core/dpcoCore';
const core = new DPCOCore();
core.enableMultiVarSolver();
const result = core.processTask({
  id: 'demo',
  operation: 'solve_system',
  params: { matrix: [[1,1],[1,-1]], rhs: [5,1] },
  constraints: { exact: true }
});
```

See `docs/GROK_INDEPENDENT_ASSESSMENT.md` and `docs/GROK_IMPLEMENTATION_REPORT.md`.
