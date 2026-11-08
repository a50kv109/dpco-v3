# DEAS-1 Structured Error Model

## 1. Overview
DEAS-1 normalizes all external execution faults into structured error categories, separating transport failures from executor errors and policy violations.

---

## 2. Normalized Error Taxonomy

| Error Code | Category | Recoverable? | Description |
| :--- | :--- | :--- | :--- |
| `CONNECTION_FAILED` | Transport | Yes | Unable to reach transport endpoint (socket error, TCP timeout). |
| `AUTHENTICATION_FAILED` | Transport | No | Invalid API key, expired token, or signature failure. |
| `EXECUTION_FAILED` | Executor | Depends | Internal error within the external software tool during processing. |
| `TIMEOUT` | Executor | Yes | Execution exceeded allocated `timeout_ms` threshold. |
| `CANCELLED` | Orchestration | No | Task was cancelled explicitly by user or workflow policy. |
| `RESOURCE_LIMIT` | Executor | No | Exceeded memory, CPU, or file size allocation limits. |
| `INVALID_INPUT` | Policy | No | Task parameters failed input schema validation. |
| `INVALID_OUTPUT` | Policy | No | External tool output failed output schema validation. |
| `ARTIFACT_TRANSFER_FAILED` | Security | Yes | Hash mismatch, size limit exceeded, or path traversal detected. |
| `PERMISSION_DENIED` | Policy | No | Executor attempted an operation outside its authorized $R0$–$R4$ role. |
| `INTERNAL_ADAPTER_ERROR` | Transport | Yes | Adapter malfunction or serialization failure. |
