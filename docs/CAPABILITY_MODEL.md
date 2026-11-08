# DPCO Capability & Qualification Model

## 1. Overview
DPCO evaluates trust per **Capability** and per **Execution Result**, never granting blanket trust to an entire software suite.

## 2. Capability Descriptors (CSP-0.2 Compatible)
External executors declare their capabilities using structured descriptors:
- **Identifier:** e.g., `arithmetic.linear.solve` or `geometry.2d.intersect`.
- **Input/Output Schemas:** JSON Schema validation definitions.
- **Constraints:** Determinism, exact arithmetic support, persistent session requirements, side-effect classifications.

## 3. Qualification & Evidence Layers
DPCO separates evidence documentation from runtime classification into three distinct layers:

### Layer A: Architectural Evidence Maturity
*Conceptual maturity model.*
- `DECLARED`, `INSPECTED`, `TESTED`, `INSTANCE_VERIFIED`, `DOMAIN_VERIFIED`.

### Layer B: Runtime `QualificationTier` (`src/core/registry.ts`)
*Current registry state classification.*
- `DECLARED`, `TESTED`, `VERIFIED`, `VALIDATED`, `ATTESTED`.

### Layer C: `EvidenceType` (`src/core/evidence.ts`)
*The kind of evidence record issued.*
- `PASSPORT_DECLARED`, `TEST_SUITE_PASSED`, `FORMALLY_VERIFIED_INSTANCE`, `FORMALLY_VERIFIED_DOMAIN`, `EMPIRICALLY_VALIDATED`, `EXTERNALLY_ATTESTED`.

*Distinction Note:* These layers are conceptually independent. An `INSTANCE_VERIFIED` result provides specific task confidence but does **not** promote the executor to `DOMAIN_VERIFIED` status for all possible future inputs. No automatic one-to-one mapping exists between these layers.

## 4. Admission Control & R-Levels
- **Fail-Closed Default:** Unvetted executors default to `UNCLASSIFIED` role.
- **Roles:** `PRODUCTION`, `NEGATIVE_CONTROL`, `BENCHMARK_ORACLE`, `UNCLASSIFIED`.
- **Risk Levels ($R0$–$R4$):** Mapped to task execution modes and approval gates.
