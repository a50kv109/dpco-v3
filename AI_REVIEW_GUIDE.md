# AI Review Guide

## Purpose
This guide establishes protocols for autonomous AI agents (ChatGPT, Gemini, DeepSeek, local models) conducting architecture audits, compliance checks, or proposing integrations for DPCO.

## Audit Steps
1. **Scope Verification:** Confirm the review target is strictly within DPCO's mathematical and geometric domain.
2. **Epistemic Audit:** Verify that execution success (`ExecStatus`) is never conflated with verification truth (`VerifyStatus`).
3. **Isolation Check:** Ensure external adapters do not self-certify isolation tiers.
4. **Verification Independence:** Confirm verifiers operate independently of producer tools.
5. **Evidence Formatting:** Produce structured findings with explicit file paths and verifiable evidence.
