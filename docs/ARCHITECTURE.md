# DPCO Architecture

The current V3 architecture baseline, trust boundaries, and explicit exclusions are documented in [DPCO V3 Architecture](DPCO_V3_ARCHITECTURE.md).

DPCO remains specialized Agent Support Middleware:

- The AI Agent formulates a structured task or hypothesis.
- DPCO validates, applies admission policy, dispatches to an eligible executor, classifies the outcome, and records the run.
- Specialized executors perform supported arithmetic or discrete geometry computations.
- IndependentVerifier checks supported result properties; a successful computation alone is not mathematical verification.
- Evidence Registry stores qualification records and explicit admission grants.
- The Ledger maintains a tamper-evident hash chain, not an externally authenticated signature.

The following are distinct: execution status, claim verdict, and verification status. DEAS-1 is **DESIGNED**, not a running external execution service. SOL runtime and SOL-Triad integration are out of scope for V3.

See [Known Limitations](KNOWN_LIMITATIONS.md), especially harness identity and common-mode verifier risks.
