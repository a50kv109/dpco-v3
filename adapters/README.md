# DPCO Adapters

## DEAS-1 executor transports

DEAS-1 executor transports (PythonAdapter, CLIAdapter, MCPAdapter, APIAdapter, GUIAdapter, ProtocolAdapter) are **DESIGNED**, not implemented.

## Agent ingress MCP server

A separate local STDIO MCP server for submitting tasks to the existing Core is **IMPLEMENTED** under `src/integrations/mcp/`. It does not implement DEAS-1 external executors. See [`docs/MCP_INTEGRATION.md`](../docs/MCP_INTEGRATION.md).
