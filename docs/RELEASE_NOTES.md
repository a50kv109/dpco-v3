# DPCO V3 — Release Notes

## 3.0.0 — Working validation baseline

DPCO V3 is a standalone working version based on the DPCO v2 Grok Independent Engineering Edition Pass 3 source. Pass 3 identifies the source edition; V3 is the new version identity.

### Stabilization changes

- Set the local package identity to `dpco-v3@3.0.0`.
- Resolved the Vite 8 / esbuild peer dependency conflict without force or legacy peer resolution.
- Fixed TypeScript typing in the multivariable test assertion helper.
- Corrected the stale expected validation message in the non-finite coefficient check.
- Added exact Fraction conversion for scientific-notation numbers and strings.
- Tightened trusted test-result ingestion: validates result counts and required profile, revision, environment, and execution-time bindings; persists the profile ID in evidence metadata.
- Removed automatic built-in production grants and synthetic `TEST_SUITE_PASSED` records from core initialization. The acceptance runner uses direct, verified preflight profiles and explicit ephemeral grants for its test core only.
- Added V3 architecture, validation, and limitation documentation.

### Validation

- TypeScript check: **PASSED**.
- Vite production build: **PASSED** (with a non-blocking `__dirname` future-config-loader warning).
- Original acceptance matrix: **54/54 PASSED**.
- Multi-variable acceptance suite: **39/39 PASSED**.

This is a validation baseline, not a release certification. See [the validation report](DPCO_V3_VALIDATION_REPORT.md) and [known limitations](KNOWN_LIMITATIONS.md).

**Release gate:** **READY FOR EXTERNAL VALIDATION**, not **READY FOR RELEASE**. Harness identity authentication, durable evidence, and broader runtime validation remain open limitations.
