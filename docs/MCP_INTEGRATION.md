# DPCO V3 MCP Integration

## Status

**IMPLEMENTED:** local Model Context Protocol (MCP) server using STDIO and the official TypeScript MCP SDK. The server calls the existing DPCO Core; it does not implement mathematical operations or grant admission.

**NOT IMPLEMENTED:** remote Streamable HTTP, HTTPS hosting, network authentication, or provider-specific cloud configuration.

## Requirements and startup

- Node.js 20 or newer
- Dependencies installed with `npm install`

From the DPCO V3 project root:

```sh
npm run mcp
```

The process speaks MCP over stdin/stdout. Diagnostics go to stderr. Do not start it in a terminal and expect human-readable output on stdout; use an MCP client.

## Exposed tools

| Tool | Purpose |
|---|---|
| `dpco_list_capabilities` | Read the manifest and in-process executor registrations. A registration does not imply admission. |
| `dpco_validate_task` | Validate request shape and operation parameters; report runtime candidates and admission/block reasons. Does not execute or change registry state. |
| `dpco_execute_task` | Submit a production-mode task through `DPCOCore.processTask`. No executor override or diagnostic mode is accepted. |
| `dpco_get_result` | Return the newest in-memory ledger record for a `taskId` handled by this server process. |

All tools declare MCP input and output schemas. Request payloads larger than 64 KiB are rejected. Matrix inputs are bounded by the adapter schema to at most 32 rows and 32 columns.

## Operation names

The DPCO manifest and task schema declare `solve_system_multivar`, while the runtime solver capability is named `solve_system`. The MCP boundary supports both forms:

- `solve_system` with `{ "eqs": [...] }` is the legacy one-variable system contract.
- `solve_system_multivar` with `{ "matrix": [...], "rhs": [...] }` is the multivariable contract.
- For compatibility, `solve_system` with matrix/rhs parameters is also normalized to the multivariable operation.
- In all multivariable cases the adapter calls Core with `operation: "solve_system"`; the mathematical core is unchanged.

The STDIO server registers both existing system executors via `enableSystemSolver()` and `enableMultiVarSolver()`. This only enables their implementations. It does **not** create evidence, issue an admission grant, or make them production-eligible.

## Task example

```json
{
  "task": {
    "id": "agent-task-001",
    "operation": "solve_system_multivar",
    "params": {
      "matrix": [["2", "3"], ["1", "-1"]],
      "rhs": ["8", "1"]
    },
    "constraints": {
      "exact": true
    }
  }
}
```

Rational strings preserve exact input semantics. The example is structurally valid but will be **BLOCKED** in an unqualified default server unless an authorized host has independently established valid evidence and a production grant for an applicable executor.

## Client configuration

The example at [`examples/mcp-client-config.json`](../examples/mcp-client-config.json) uses the MCP STDIO transport. In compatible clients, set `cwd` to the local DPCO V3 path. For this machine the value is `/home/andrii/AI-Workspace/DPCO/DPCO_V3`.

The server process inherits its environment from the MCP client. It does not read `.env` files or accept secrets over MCP. The tool interface exposes no filesystem browsing, shell, or arbitrary executor-registration tools.

## Response semantics

`dpco_execute_task` returns separate `executionStatus`, `claimVerdict`, and `verificationStatus` fields. `BLOCKED` is not a failed mathematical computation; it means validation, contradiction policy, capability, qualification, or admission stopped execution. `SUCCESS` with `UNVERIFIED` must not be treated as a verified result.

`dpco_get_result` looks up only the newest matching ledger record in this server process. The ledger, grants, and evidence are in-memory and are not shared across restarts or separate server processes.

The execution response includes the scalar root, multivariable solution map, or geometry result where present. Core's existing ledger hash does not cover every output field (in particular, the full multivariable solution map or geometry payload), so do not treat `recordHash` as a cryptographic commitment to the entire returned mathematical result.

## Testing

Run the integration tests with:

```sh
npm run test:mcp
```

The tests start a real STDIO server process and call the registered tools using the MCP SDK client. An in-memory test server uses a real `DPCOCore`; its positive execution test runs the existing explicit acceptance preflight helper, which directly checks real executor outputs with the IndependentVerifier before creating temporary test-process evidence and grants. The production server itself never performs that setup.
