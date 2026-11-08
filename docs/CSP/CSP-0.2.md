# Cognitive Skill Passport Specification (CSP-0.2)
*Standards Reference: CSP-0.2 Specification Baseline*

---

## 1. Overview & Canonical Core Grammar

Cognitive Skill Passports (CSP-0.2) provide a standardized machine-readable manifest format for declaring capabilities, constraints, compatibility channels, and runtime execution properties.

### The Canonical CORE Formula
```
CORE = Nature . Action . Domain
```

- **Nature (`OP`, `PR`, `AG`, `MI`):**
  - `OP`: Operator (Deterministic function or mathematical solver)
  - `PR`: Procedure (Multi-step algorithmic pipeline)
  - `AG`: Agent (Autonomous reasoning agent)
  - `MI`: Mind Model (Cognitive or neural heuristic model)

- **Action (`TR`, `AN`, `SY`, `CO`):**
  - `TR`: Transformation (Input-to-output data conversion or solving)
  - `AN`: Analysis (Verification, inspection, or contradiction checking)
  - `SY`: Synthesis (Generation of structures or models)
  - `CO`: Coordination (Orchestration of multi-step workflows)

- **Domain (`DATA`, `LANG`, `SYS`, `VIS`):**
  - `DATA`: Structured data, arithmetic, and numerical matrices
  - `LANG`: Text, dialogue, and symbolic syntax
  - `SYS`: Engineering systems, constraints, and equations
  - `VIS`: Spatial, 2D/3D geometry, and visual graphics

---

## 2. Passport Structure & Compatibility Blocks

A valid CSP-0.2 document contains:
1. **`passport` Block:** Core string, description, requirements (`reasoning_depth`, `structure`, `adaptability`), and metadata.
2. **`compatibility` Block:** Input and output channels (`category`, `formats`, `capabilities`) and runtime constraints (`exact_arithmetic`, `tolerance`).
3. **`extensions["dpco.execution/v1"]` Block:** DPCO-specific operational properties (`declared_role`, `exact_arithmetic_declared`, `determinism_guarantee_declared`, `isolation_tier_declared`).

---

## 3. Example Passports

### Valid CSP-0.2 / DPCO Passport Example
```yaml
passport:
  core: "OP.TR.DATA"
  description: "Exact rational arithmetic solver"
  # ... (other passport fields)
extensions:
  dpco.execution/v1:
    declared_role: "UNCLASSIFIED" # Claimed by executor
    exact_arithmetic_declared: true
```

*Note: `declared_role` in the passport is a claim by the executor. It does not grant `PRODUCTION` authority. Effective operational role is determined solely by DPCO policy engine and `AdmissionGrant` issuance.*

### Invalid Passport Example (Violates CORE Regex)
```yaml
passport:
  core: "INVALID.ACTION.DOMAIN" # Fails CSP_CORE_REGEX validation
  description: "Malformed core structure"
```
*(Validation fails with error: `Invalid CORE format. Expected Nature.Action.Domain where Nature in OP,PR,AG,MI; Action in TR,AN,SY,CO; Domain in DATA,LANG,SYS,VIS.`)*
