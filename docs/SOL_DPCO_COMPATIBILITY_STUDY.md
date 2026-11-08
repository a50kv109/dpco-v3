# SOL–DPCO Architectural Compatibility Study
## Independent Analysis — No Code Changes

**Date:** 2026-11-08  
**DPCO baseline:** Grok Independent Engineering Edition Pass 3  
**SOL inputs:** SOL-2-sol-for-agents (O7 canon), SOL-Triad-Engine  
**Scope:** Architecture research only. No implementation claims. No source modifications.

---

## 1. Executive Conclusion

DPCO and SOL address **overlapping but non-identical** control problems.

| System | Primary question it answers |
|--------|-----------------------------|
| **DPCO** | *How do we admit, dispatch, execute, independently verify, and record a mathematical/geometric computation?* |
| **SOL O7** | *What irreducible structural roles must any controlled operation expose (origin, state, transfer, bound, comparison, loss, authority)?* |
| **SOL-Triad** | *Given SOURCE, CONSTRAINT, and DISSIPATE packets, is the intended action structurally admissible (PASS / REVIEW / FAIL)?* |

**Recommendation:** Do **not** merge SOL repositories into DPCO and do **not** reimplement all seven O7 primitives as new subsystems.  
Instead:

1. **Formalize** existing DPCO contracts with explicit SOL vocabulary where semantics already align (SOURCE ≈ Evidence/provenance; CONSTRAINT ≈ validation + admission bounds; CAPABILITY ≈ registry + grants).
2. **Extend** DPCO with a narrow **pre-execution Triad admissibility adapter** (optional, fail-closed) that is strictly separate from mathematical IndependentVerifier.
3. **Reject** absorbing SOL Decision Layer wholesale as a general agent framework, FLOW-as-workflow-engine, or COMPARE-as-optimizer.

DPCO’s identity as *specialized mathematical/geometric execution middleware* must remain unchanged. SOL strengthens **admissibility and epistemic structure**, not equation-solving power.

---

## 2. SOL-to-DPCO Primitive Mapping

Classification key:  
**REUSE** · **FORMALIZE** · **EXTEND** · **NEW** · **REJECT**

### 2.1 SOURCE

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Unforgeable root origin / genesis anchor of data, intent, or authority — not merely “an input file”. |
| **DPCO overlap** | Evidence Registry (`EvidenceRecord`, issuer, artifact_hash), Ledger provenance, Task `id` + claim origin (weak), AdmissionGrant `authorized_by` / `policy_id`. |
| **Same semantics?** | **Partial.** DPCO tracks evidence *about executors and results*; it does not yet treat every Task as carrying a typed SOURCE packet (who/what authorizes *this* computation request). |
| **Gap** | Task-level origin authority (agent identity, policy scope, evidence binding for the *request*) is informal. |
| **Benefit of formal SOL contract** | High for multi-agent and audit scenarios. |
| **Class** | **FORMALIZE** (request-level SOURCE) + **EXTEND** (bind Task → Evidence/SOURCE packet). |

### 2.2 STATE

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Discrete, settled snapshot — not in-flight mutation. |
| **DPCO overlap** | Task params, pipeline steps (`PipelineStep`), LedgerRecord, geometry/arithmetic payloads. |
| **Same semantics?** | Partial. DPCO has sequential steps and final records, not a first-class immutable STATE type with explicit “settled vs in-flight”. |
| **Gap** | Explicit state machine for task lifecycle beyond ad-hoc steps. |
| **Benefit** | Medium — improves audit clarity; low urgency if Ledger remains authoritative. |
| **Class** | **FORMALIZE** (document pipeline steps as STATE transitions). |

### 2.3 FLOW

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Directed transfer over Δt > 0; failure modes in transit. |
| **DPCO overlap** | Dispatcher → executor invocation; DEAS-1 async contract (DESIGNED); processTask pipeline. |
| **Same semantics?** | Weak. Synchronous built-ins hide transfer; DEAS-1 is not fully implemented. |
| **Gap** | True async transfer semantics, cancellation, partial delivery. |
| **Benefit** | Real only when DEAS-1 ships; premature FLOW abstraction risks workflow-manager creep. |
| **Class** | **REJECT** as a standalone O7 subsystem inside DPCO core · **EXTEND** only inside DEAS-1 transport when implemented. |

### 2.4 CONSTRAINT

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Non-negotiable boundary; violation ⇒ invalid (∅). |
| **DPCO overlap** | ConstraintValidator, ContradictionGate, exactness/rigor constraints, MAX_COORD / domain rejects, Admission Policy. |
| **Same semantics?** | Strong partial match for *input and domain* constraints; weaker for *side-effect / consequence* constraints. |
| **Gap** | Unified CONSTRAINT packet spanning math domain + admission + declared side effects. |
| **Benefit** | High if shared with Triad P_SC / P_CD. |
| **Class** | **FORMALIZE** + **EXTEND** (unified CONSTRAINT view for Triad adapter). |

### 2.5 COMPARE

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Structural comparison of states / detection of difference — not optimization. |
| **DPCO overlap** | IndependentVerifier (residual, incidence), ResultClassifier (ExecStatus × ClaimVerdict × VerifyStatus). |
| **Same semantics?** | Partial. Verifier is *mathematical* COMPARE; Classifier is *epistemic* COMPARE. Neither is general structural diff. |
| **Gap** | General state-diff language unnecessary for current scope. |
| **Benefit** | Low if renamed; risk of conflating math verification with Triad admissibility. |
| **Class** | **REUSE** IndependentVerifier as math COMPARE · **REJECT** generic COMPARE engine in core. |

### 2.6 DISSIPATE

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Loss, deletion, irreversible side effects, cost, residual dissipation. |
| **DPCO overlap** | Isolation timeout (post-hoc), ledger append (irreversible log), error paths; weak explicit side-effect model. |
| **Same semantics?** | Weak. DPCO does not declare or gate *computational side effects* (resource burn, external writes) as first-class DISSIPATE. |
| **Gap** | Declared vs observed side effects; risk class of operation. |
| **Benefit** | High for external executors (DEAS-1); medium for pure in-process exact math. |
| **Class** | **EXTEND** (declared DISSIPATE profile per executor) · **NEW** only for external adapter boundary. |

### 2.7 CAPABILITY

| Aspect | Content |
|--------|---------|
| **SOL meaning** | Authority / right to perform an operation — distinct from mere ability. |
| **DPCO overlap** | CapabilityRegistry, CSP Passport, AdmissionGrant, effective_role, qualification vs admission separation (Pass 2–3). |
| **Same semantics?** | **Strong.** DPCO already separates declared capability, tested qualification, and granted admission. |
| **Gap** | Machine-readable CAPABILITY still evolving (manifest Pass 3); runtime availability vs grant still subtle. |
| **Benefit** | Formal SOL naming would mainly clarify docs, not rewrite registry. |
| **Class** | **REUSE** + **FORMALIZE** (map CAPABILITY ↔ registry+grant vocabulary in docs). |

---

## 3. SOL-Triad Pairwise Analysis

Triad kernel evaluates **⟨SOURCE, CONSTRAINT, DISSIPATE⟩** via:

| Pair | Question | DPCO analogue | Distinct? |
|------|----------|---------------|-----------|
| **P_SC** | Does SOURCE authority align with CONSTRAINT bounds? | AdmissionGrant vs task constraints / domain | Yes — Triad is structural; Admission is policy+role |
| **P_CD** | Do proposed consequences respect constraints? | Weak today (validation is input-centric) | Yes — fills DISSIPATE gap |
| **P_SD** | Are consequences authorized by SOURCE? | Implicit via grant scope | Partially — rarely explicit |

**Verdict vocabulary:** PASS / REVIEW / FAIL (fail-closed).

### Separation of control planes (must not merge)

| Plane | Responsibility | Must not be confused with |
|-------|----------------|---------------------------|
| **Triad admissibility** | Structural coherence of origin, bounds, consequences *before* execution | Math correctness |
| **DPCO Admission Policy** | Role grants, evidence thresholds, PRODUCTION vs DIAGNOSTIC | Triad structural checks |
| **IndependentVerifier** | Mathematical residual / incidence / claim truth | Operational permission |
| **Executor qualification** | TESTED / DOMAIN evidence about *solver quality* | Request SOURCE authority |
| **Isolation / security** | Process bounds, timeouts, sandboxing | Epistemic Triad |

Triad **does not** prove \(A\mathbf{x}=\mathbf{b}\).  
IndependentVerifier **does not** prove the agent was authorized to ask.

---

## 4. Existing Functionality vs Semantic Gaps

| Area | DPCO Pass 3 status | Gap relative to SOL |
|------|--------------------|---------------------|
| Math execution & residual verify | Strong (exact ℚ, geometry 2D) | Out of SOL scope |
| Capability / admission | Strong separation post Pass 2–3 | Naming/formal SOURCE of *request* |
| Evidence provenance | Improved ingestion API; harness allow-list still string-level | True attestation / signature of harness |
| Pre-execution structural triad | Absent | P_SC / P_CD / P_SD not present |
| Side-effect model | Minimal | DISSIPATE under-specified |
| Async FLOW | DEAS-1 DESIGNED only | Do not fake FLOW until transport exists |
| Agent decision layer | Out of scope by design | REJECT embedding general SOL Decision Layer |

---

## 5. Proposed Integration Architecture (Narrowest Useful)

```
AI Agent
  │  structured Task + optional SOURCE metadata
  ▼
DPCO Ingress
  │  schema / ConstraintValidator / ContradictionGate
  ▼
[ OPTIONAL ] SOL-Triad Adapter  ──►  ⟨S, C, D⟩ evaluate  ──► PASS | REVIEW | FAIL
  │                                      │
  │ FAIL  → BLOCKED (reason=TRIAD_FAIL)  │
  │ REVIEW → policy (block or escalate)  │
  │ PASS  → continue                     │
  ▼
Admission Policy (effective_role, evidence, rigor)
  ▼
Dispatcher → Executor
  ▼
IndependentVerifier (math only)
  ▼
Classifier → Evidence / Ledger
```

**Recommended insertion point:**  
**Between ConstraintValidator/ContradictionGate and Admission/Dispatcher**  
(after syntactic/domain validation, before expensive dispatch).

**Not recommended:** after math verification (too late for admissibility); replacing Admission; replacing IndependentVerifier.

---

## 6. Risks, Overlaps, Failure Modes

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Double gate conflict** | Triad FAIL vs Admission PASS or vice versa | Explicit precedence: Triad FAIL always blocks; Admission remains necessary |
| **Semantic overload** | Calling residual check “COMPARE” or admission “SOURCE” without contracts | Mapping doc only until typed packets exist |
| **False trust** | String harness_id allow-list ≠ cryptographic attestation | Document Pass 3 limit; future signed test results |
| **Scope creep** | Full O7 runtime inside DPCO | REJECT; keep mathematical domain boundary |
| **Common-mode** | Shared Fraction in executor+verifier | Already documented; Triad must not share math code paths |
| **REVIEW limbo** | Unhandled REVIEW becomes silent PASS | Fail-closed default: REVIEW ⇒ BLOCKED unless policy says otherwise |

---

## 7. Minimal Implementation Roadmap (Future — not done here)

| Step | Action | Class |
|------|--------|-------|
| A | Publish this mapping; add SOL vocabulary notes to GLOSSARY only when approved | FORMALIZE |
| B | Define typed DTOs: `SolSource`, `SolConstraint`, `SolDissipate` derived from Task+Registry (no engine dependency) | NEW (types only) |
| C | Optional adapter calling external Triad `evaluate_json` behind interface; default off | NEW (adapter) |
| D | Wire fail-closed on FAIL; configurable REVIEW | EXTEND processTask |
| E | Executor passport field: declared DISSIPATE profile (cpu, external IO: none) | EXTEND |
| F | Defer FLOW until DEAS-1 exists | REJECT now |

---

## 8. Explicit Non-Integration List (REJECT)

1. **Full O7 runtime as seven internal DPCO services** — duplicates registry, validator, verifier under new names.  
2. **SOL Decision Layer as replacement for agent reasoning** — out of DPCO product scope.  
3. **COMPARE-as-optimizer / search** — SOL itself rejects this; DPCO must too.  
4. **FLOW-as-general workflow / DAG engine** — roadmap item may exist, but not via SOL core merge.  
5. **Absorbing SOL-Triad Engine source tree into DPCO monorepo without adapter boundary** — couples release cycles and trust models.  
6. **Claiming Triad PASS implies mathematical VerifyStatus.VERIFIED** — category error.  
7. **Claiming TEST_SUITE_PASSED implies DOMAIN_VERIFIED** — already forbidden in Pass 2–3; SOL must not reopen it.  
8. **Using Triad to select executors** — dispatcher/cost remains DPCO’s job.

---

## 9. Feature Classification Summary

| Feature | Classification |
|---------|----------------|
| Evidence / Ledger as SOURCE-like provenance | REUSE + FORMALIZE |
| Request-level SOURCE packet on Task | EXTEND |
| ConstraintValidator + Admission as CONSTRAINT | REUSE + FORMALIZE |
| Unified CONSTRAINT view for Triad | EXTEND |
| IndependentVerifier as math COMPARE | REUSE |
| Generic structural COMPARE engine | REJECT |
| CapabilityRegistry + AdmissionGrant as CAPABILITY | REUSE + FORMALIZE |
| DISSIPATE profiles for executors | EXTEND |
| Pre-execution SOL-Triad adapter | NEW (optional, narrow) |
| Full O7 / Decision Layer inside DPCO | REJECT |
| FLOW subsystem before DEAS-1 | REJECT |

---

## 10. Closing Position

SOL does not make DPCO a better linear-algebra engine.  
It can make DPCO a **stricter gate** on *why* a computation is allowed, *under which bounds*, and *with which declared consequences* — complementary to IndependentVerifier’s *whether the answer is mathematically right*.

Pass 3 already moved DPCO toward honest evidence provenance and residual epistemic bounds. The highest-value SOL contribution is to **name and harden the admissibility plane** (SOURCE–CONSTRAINT–DISSIPATE) without collapsing it into qualification, admission policy, or math verification.

**Next action for implementers (outside this study):**  
Only after Pass 3 test matrix is executed green in a real environment should a *minimal* Triad adapter spike be considered — behind a feature flag, fail-closed, with no change to mathematical executors.

---

*End of study. No source, tests, or schemas were modified for this deliverable beyond adding this document.*
