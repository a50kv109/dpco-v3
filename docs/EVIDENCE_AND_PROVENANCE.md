# DPCO V3 Evidence and Provenance

## Evidence records

The in-memory Evidence Registry models declared and verified evidence, profile test results, and admission grants. Core initialization creates no grants or `TEST_SUITE_PASSED` records for built-ins. Enabling the multivariable solver only registers its implementation; its effective role remains `UNCLASSIFIED`.

The local acceptance runner performs direct executor smoke checks, then creates run-bound evidence and explicit grants in its temporary test core. It does not write those records to the project or grant production access in a regular application instance.

## Test-result ingestion

`EvidenceRegistry.ingestTestResult()` checks the harness ID against a static allow-list, requires a passing result with valid check counts, and records the claimed source revision, environment, test profile, and execution timestamp.

This provides data binding, not attestation:

- The harness ID is a caller-provided string, not an authenticated identity.
- The source revision and environment are caller-provided claims.
- Optional artifact hashes are not independently verified.
- The registry and grants are in-memory.

Do not treat an allow-listed harness name or a hash value alone as proof that a particular trusted process produced a result.

## Execution ledger

The SHA-256 chain links records and can detect mutation relative to the stored chain. It is not a blockchain, digital signature, trusted timestamp, or external anchor, and does not by itself prove who generated the records.

See [DPCO V3 Architecture](DPCO_V3_ARCHITECTURE.md) and [Known Limitations](KNOWN_LIMITATIONS.md).
