# DPCO V3 Validation Report

**Validation date:** 2026-11-08  
**Project root:** `DPCO_V3`  
**Source:** independent copy of `DPCO_GROK_PASS3_VALIDATION`  
**Git repository:** none; no GitHub repository or remote was created.

## Environment

| Item | Result |
|---|---|
| Operating system | Linux x86_64 (Ubuntu-based host) |
| Node.js | `v20.19.5` |
| npm | `10.8.2` |
| Python | `3.12.3`; not required by the executed TypeScript checks |
| Dependencies | Installed locally in V3; no global packages installed |
| npm install audit summary | **PASSED** — 0 vulnerabilities reported |

`npm install` initially failed because Vite 8's optional esbuild peer range (`^0.27.0 || ^0.28.0`) conflicted with the manifest's `esbuild@^0.25.0`. In V3 only, the package identity was set to `dpco-v3@3.0.0` and the esbuild range updated to `^0.28.0`; installation then completed. The validation and original-copy directories were not modified.

## Commands executed

All commands ran from the V3 project root.

| Command | Status | Result |
|---|---|---|
| `npm install` | **EXECUTED / PASSED** | 179 packages added; 0 vulnerabilities reported |
| `npm run lint` | **EXECUTED / PASSED** | `tsc --noEmit` completed with no diagnostics after the test type fix |
| `npm run build` | **EXECUTED / PASSED** | Vite production build completed |
| `npx tsx scripts/run_all_tests.ts` | **EXECUTED / PASSED** | 54/54: core 19/19, CSP 10/10, Revision 4 25/25 |
| `npx tsx scripts/test_multivar_suite.ts` | **EXECUTED / PASSED** | 39/39 assertions, including exact scientific notation, admission, and evidence binding cases |

The build emits a non-blocking Vite warning: `vite.config.ts` uses `__dirname`, which is unsupported by Vite's future native config loader. The current build succeeds; this was not changed because it is not required for the V3 stabilization criteria.

## Findings and fixes

1. **Dependency conflict — FIXED:** updated V3's direct esbuild range to match Vite 8's peer range.
2. **TypeScript errors in multivariable test helper — FIXED:** assertion detail accepts nullable error text.
3. **Stale E07 reason expectation — FIXED:** corrected the test's expected reason fragment to match the validator's actual message. The observed status was already `BLOCKED / UNKNOWN / UNVERIFIED`.
4. **Scientific notation conversion — FIXED:** finite fractional numbers such as `1e-7` previously failed in `Fraction`; numeric and string scientific notation are now normalized to decimal form. Regression assertions cover small, signed, and exponent forms.
5. **Evidence input binding — FIXED:** ingestion now requires non-empty domain/environment/profile/revision/executor and a valid execution timestamp; validates positive integer total counts and bounded nonnegative failure counts; stores the test profile/domain in evidence metadata. Regression assertions cover these checks.
6. **Automatic legacy qualification — FIXED:** removed the registry's bootstrap production grants and static `TEST_SUITE_PASSED` records. Core startup now leaves built-ins unadmitted. The acceptance runner executes five direct smoke profiles, verifies them, records run-bound evidence in-memory, and explicitly grants its temporary test core.

## Mathematical and admission checks

- **TESTED:** BigInt arithmetic, fractional coefficients, large integers, unique/inconsistent/underdetermined systems, zero-column and empty matrices, residual checks, missing/extra coordinates, and the explicit non-uniqueness result.
- **TESTED:** after enabling the multivariable solver, its effective role remains `UNCLASSIFIED` without an explicit grant; production-mode execution is blocked; no `EVID-MULTIVAR-TESTED` is created during initialization.
- **STATICALLY_INSPECTED:** `MultiVarLinearExecutor` uses exact `Fraction` elimination, and `verifyLinearSolutionByResidual` explicitly limits its claim to residual satisfaction.
- **KNOWN_LIMITATION:** solver and residual verifier share `Fraction`, so arithmetic defects can affect both paths.
- **TESTED:** normal core initialization creates no admission grants or built-in `TEST_SUITE_PASSED` evidence; V3's acceptance runner issues only ephemeral grants after direct executor checks.
- **KNOWN LIMITATION:** trusted harness identities are plain strings checked against an allow-list. The registry does not authenticate the process or independently verify evidence artifacts.

## Not tested

- Browser/UI behavior or live Gemini/API integration.
- DEAS-1 runtime, which remains **DESIGNED**.
- OS-level isolation, subprocess security, or production deployment.
- The legacy Python PoC test suite.
- Mathematical completeness for all possible inputs.

## Status

The targeted V3 build and acceptance checks pass. Core initialization is now fail-closed with no automatic grants or passing-test evidence. The suite's test-only grants follow five direct smoke checks and are scoped to the temporary test core. Overall status: **READY FOR EXTERNAL VALIDATION**, not **READY FOR RELEASE**; harness identity authentication and durable evidence remain known limitations.
