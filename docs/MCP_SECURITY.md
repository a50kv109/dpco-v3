# DPCO V3 MCP Security Notes

## Transport boundary

- **Implemented:** local STDIO only. The MCP client starts the server process; requests and responses use stdin/stdout.
- **Not implemented:** HTTP hosting, TLS, remote identity, authorization middleware, network rate limiting, or tenant separation.
- STDIO is not a sandbox. The process runs with the operating-system identity and environment of its launcher. Connect only trusted local MCP clients and do not expose the process through an unrelated wrapper.
- The server writes protocol messages to stdout and startup failures to stderr.

## Admission is enforced by Core

- The MCP server never calls `issueAdmissionGrant`, `addEvidence`, or `ingestTestResult`.
- A fresh production server remains fail-closed. It may list executor registrations, but registrations do not imply qualification or admission.
- `dpco_execute_task` submits only ordinary production-mode `Task` objects to `DPCOCore.processTask`.
- The request schema does not expose `execution_mode`, `forceExecutor`, admission grants, evidence mutation, custom executor registration, or registry mutation. Attempts to include additional task properties are rejected.
- `dpco_validate_task` reports compatible candidates but cannot alter evidence or grant state.
- No mathematical result is returned as `VERIFIED` unless the existing Core IndependentVerifier marks it so.

The adapter does not provide an external operator interface for admission. Qualification and grants must be established through a separately controlled, trusted host process. The current Core evidence/grant registry is in-memory.

## Input limits and operation mapping

- MCP inputs are constrained by declared Zod schemas and a 10,000-element MCP argument limit.
- A task is additionally capped at 64 KiB of JSON.
- Matrix operations are limited to 32 rows and 32 columns per request.
- The `solve_system_multivar` MCP alias maps to Core's existing `solve_system` operation only when matrix/rhs parameters are supplied. The alias does not add a Core operation.
- Validation schemas constrain request shape but do not replace Core validation, admission, or IndependentVerifier checks.

## Data returned

- Task parameters, result status, reason, grant ID, evidence IDs, and verification steps may be returned to the calling MCP client.
- `dpco_get_result` exposes ledger records by caller-supplied task ID within the current process. Do not use the local process for mutually untrusted clients sharing the same MCP session.
- Core's current hash-chain serialization does not include every returned result field. In particular, the complete multivariable solution map and geometry payload are not cryptographically committed by the ledger record hash; do not present that hash as a digest of the full MCP response.
- The adapter exposes no filesystem read/write, shell execution, arbitrary URL fetch, custom executor, or arbitrary code tool.
- Error responses omit stack traces and filesystem paths.

## Known limitations

- No client authentication on STDIO beyond the local process-launch boundary.
- No per-user authorization, rate controls beyond request-size limits, or durable audit persistence.
- Core execution isolation remains the existing in-process wrapper; the MCP adapter cannot forcibly stop a synchronous computation after a timeout.
- Test-only acceptance setup is used only by integration tests. It creates ephemeral in-memory evidence/grants after direct checks; it is not part of the production server startup path.
