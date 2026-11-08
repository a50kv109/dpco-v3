# DPCO V3

DPCO V3 is the third standalone working version of the Deterministic Processing & Control Orchestrator. It is based on the Grok Independent Engineering Edition Pass 3 source tree, with narrowly scoped stabilization fixes and validation documentation.

DPCO is specialized Agent Support Middleware for mathematical and discrete geometry operations. It is not a general-purpose agent platform.

**Current status: READY FOR EXTERNAL VALIDATION.** Core startup creates no admission grants or passing-test evidence. The test runner creates short-lived grants only after its local direct-executor preflight succeeds. See [the validation report](docs/DPCO_V3_VALIDATION_REPORT.md).

## Responsibility boundaries

- **AI Agent:** formulates tasks and hypotheses.
- **DPCO:** validates inputs, applies admission policy, dispatches work, tracks execution, and records provenance.
- **Specialized Executors:** perform supported mathematical or geometric operations.
- **IndependentVerifier:** independently checks supported result properties.
- **Evidence Registry:** stores qualification evidence and admission grants.
- **Ledger:** records execution transitions in a hash-chained log.

A successful residual check establishes that a supplied vector satisfies the given system. It does **not** establish uniqueness. The multi-variable solver and its residual verifier share the `Fraction` implementation, so they have a common-mode arithmetic risk.

## Scope freeze

V3 does not add mathematical operations, execution subsystems, a SOL runtime/adapter, or a generic workflow engine. DEAS-1 remains **DESIGNED**, not a running external-execution service. See [the V3 architecture](docs/DPCO_V3_ARCHITECTURE.md) and [known limitations](docs/KNOWN_LIMITATIONS.md).

## Requirements and commands

Use Node.js 20.19+ and npm. Run commands from the project root:

```sh
npm install
npm run lint
npm run build
npx tsx scripts/run_all_tests.ts
npx tsx scripts/test_multivar_suite.ts
```

- `npm run lint` runs `tsc --noEmit`.
- `npm run build` runs the Vite production build.
- The original acceptance matrix is invoked directly with `npx tsx`; it is not an npm script.
- The multivariable acceptance suite is also invoked directly with `npx tsx`; it is not an npm script.

The latest recorded results are in [the V3 validation report](docs/DPCO_V3_VALIDATION_REPORT.md). Test results cover the listed fixtures only; they are not a proof of correctness over all inputs.

## Status terminology

- **IMPLEMENTED:** code exists in this copy.
- **STATICALLY_INSPECTED:** source/configuration was reviewed; no runtime claim is implied.
- **TESTED:** a named local test command was executed and passed.
- **NOT_TESTED:** no runtime validation was performed.
- **DESIGNED:** documented contract or proposal without a running implementation.
- **KNOWN_LIMITATION:** a verified boundary or unresolved risk.

## Project history

`README_GROK_EDITION.md` and the Grok reports describe the source edition and are retained as historical artifacts. DPCO V3 is the current working identity; Pass 3 refers to the source edition, not the V3 release status.
