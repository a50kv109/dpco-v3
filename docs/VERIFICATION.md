# DPCO Verification & Evidence Specification

## 1. Epistemic Separation
DPCO maintains strict boundaries between three independent evaluation dimensions:
1. **Execution Status (`ExecStatus`):** Did the operation complete successfully without crashing?
2. **Claim Verdict (`ClaimVerdict`):** Is the claimed mathematical assertion true?
3. **Verification Status (`VerifyStatus`):** Did independent verification confirm the result?

## 2. Independent Verifier Subsystem
The verifier operates on independent evaluation logic separate from the producer tool (e.g. back-substitution of roots into linear equations, geometric incidence checks, and tangent verification).

## 3. Evidence Registry & Ledger
- **Evidence Records:** Track orthogonal evidence dimensions (`PASSPORT_DECLARED`, `TEST_SUITE_PASSED`, `INSTANCE_VERIFIED`, etc.).
- **Execution Ledger:** Tamper-evident SHA-256 block hashing recording every pipeline transition and artifact hash.
