# DPCO Integration Guide

> **DPCO V3 status:** This page describes the DEAS-1 external-executor design. A separate local STDIO MCP server is implemented for agent-to-DPCO task submission; see [the MCP Integration Guide](docs/MCP_INTEGRATION.md). REST/HTTP, CLI, Python, and DEAS-1 executor transports remain unimplemented.

## 1. Overview
This guide outlines how to integrate external mathematical, geometric, or CAD software systems into DPCO using the **DEAS-1 (DPCO External Executor Adapter Standard v1)** runtime contract.

## 2. Integration Checklist
1. **Define Capability Descriptor:** Specify operation ID, version, input/output JSON schemas, determinism constraints, and precision limits.
2. **Implement `IDeasExecutor`:** Implement asynchronous `executeTask()` and `healthCheck()` methods.
3. **Configure Transport:** Select appropriate transport (`PythonAdapter` for script execution or `CLIAdapter` for binary execution).
4. **Register with CapabilityRegistry:** Register executor capabilities and request admission grants.
5. **Attach Independent Verifier:** Ensure verification logic is implemented for the target domain.
