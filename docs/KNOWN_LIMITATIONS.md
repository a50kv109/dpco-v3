# Known Limitations

## Evidence and admission

- Core initialization creates no admission grants or `TEST_SUITE_PASSED` records. Built-in executors remain unadmitted until explicitly qualified and granted; production dispatch is fail-closed by default.
- The acceptance runner creates an ephemeral test core and issues explicit grants only after direct smoke checks are verified. Those grants/evidence do not persist and do not qualify a normal application instance.
- Trusted harness IDs are caller-provided strings checked against an allow-list; there is no cryptographic process identity or signed result verification.
- Test-result metadata is recorded but not independently attested. `artifact_hash` is optional and is not checked against an external artifact.
- Evidence and grants are in-memory and are not a durable, signed qualification store.

## Arithmetic and verification

- The multi-variable solver and residual verifier share `Fraction`/BigInt arithmetic, creating common-mode risk.
- Residual verification proves only that a supplied candidate satisfies `A·x=b`; it does not independently prove uniqueness or derive a rank certificate.
- Finite JavaScript numbers are interpreted by their shortest decimal string, not by their exact IEEE-754 binary value. Use integer, decimal, or rational strings when input semantics require an exact value.
- Tests cover finite fixtures only; they do not prove algorithmic correctness for all matrix dimensions or values.

## Isolation, execution, and scope

- The current isolation wrapper is in-process; synchronous work cannot be forcibly interrupted by a post-call timeout check.
- DEAS-1, external subprocess adapters, and external artifact security are **DESIGNED**, not running implementations.
- Geometry support is limited to implemented discrete 2D operations; it is not a general geometry theorem prover or physical folding simulator.
- Browser/UI, live API integration, production deployment, and the legacy Python PoC tests were **NOT_TESTED** in the V3 validation run.
- The Vite build succeeds but warns that the configuration uses `__dirname` with the future native config loader.
