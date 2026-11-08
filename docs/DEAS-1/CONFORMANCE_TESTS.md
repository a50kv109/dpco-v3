# DEAS-1 Conformance Tests Specification

## 1. Overview
Every DEAS-1 adapter implementation must pass the standard conformance test suite before admission into a DPCO runtime environment.

---

## 2. Conformance Test Suites

1. **Discovery & Identity Test:** Verify that `getIdentity()` and `discoverCapabilities()` return valid CSP-0.2 compliant metadata without error.
2. **Input Validation Test:** Verify that malformed task requests are rejected with `INVALID_INPUT` prior to execution.
3. **Timeout & Cancellation Test:** Verify that long-running or hanging tasks are successfully trapped and returned as `TIMEOUT` or `CANCELLED`.
4. **Error Normalization Test:** Verify that raw transport exceptions are wrapped into standard `DeasNormalizedError` codes.
5. **Artifact Integrity Test:** Verify that transferred artifacts undergo canonical path resolution, symlink checks, and SHA-256 content hash verification.
6. **Permission Enforcement Test:** Verify that unauthorized executors cannot bypass DPCO Core admission gates.
