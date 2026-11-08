# DEAS-1 Transport Profiles (DESIGNED)

## 1. Overview
DEAS-1 supports multiple transport profiles. Note that these transport profiles are designed specifications and are not all implemented in the current v2 baseline core.

---

## 2. Transport Profiles

### A. PythonAdapter
- **Purpose:** Bridges DPCO to Python-based numeric/symbolic libraries (e.g. SymPy, SciPy).
- **Lifecycle:** Interpreter spawn $\to$ JSON over Stdin/Stdout IPC $\to$ clean shutdown.
- **Constraints & Security:** Virtualenv sandboxing, execution timeout, no unsafe pickle deserialization.
- **Error Model:** Standardized `DeasNormalizedError` wrapping Python tracebacks.

### B. CLIAdapter
- **Purpose:** Wraps command-line binary executables and background math tools.
- **Lifecycle:** Subprocess spawn $\to$ argument/stdin piping $\to$ exit code trapping.
- **Constraints & Security:** OS process isolation, resource limits, file descriptor restrictions.

### C. MCPAdapter
- **Purpose:** Model Context Protocol JSON-RPC servers.
- **Lifecycle:** Persistent bidirectional socket/stdio handshake $\to$ tool-call message exchange.

### D. APIAdapter / GUIAdapter / ProtocolAdapter
- **Purpose:** Remote HTTP/gRPC endpoints, headless desktop UI automation (Blender, AutoCAD), and binary WebSocket streams.
- **Security & Limitations:** Requires workspace sandboxing, session state snapshots, and human-approval gates for destructive actions ($R3$/$R4$).
