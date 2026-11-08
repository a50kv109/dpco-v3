# DPCO Security Specification

## 1. Trust & Permission Model
DPCO enforces strict fail-closed admission control. External executors and adapters default to `UNCLASSIFIED` and cannot grant themselves privileges or qualifications.

## 2. Isolation Authority
Runtime isolation tiers (`IN_PROCESS_GUARDED`, `WORKER_ISOLATED`, `PROCESS_ISOLATED`, `CONTAINER_ISOLATED`) are evaluated and certified by DPCO Core runtime, not trusted from adapter self-declarations.

## 3. Artifact Security & File System Protection
- **URI Restrictions:** Allowed schemes restricted to `data://`, sandbox-restricted `file://`, and `cas://`. Remote `http://` URLs blocked by default to prevent SSRF.
- **Path Resolution & Traversal Defense:** Simple string prefix checks are insufficient. Artifact security mandates canonical path resolution (`fs.realpathSync`), symlink validation, and protection against TOCTOU (Time-of-Check to Time-of-Use) race conditions when accessing workspace files.
- **Content Hash Verification:** SHA-256 hashes verified on all transferred artifacts.
