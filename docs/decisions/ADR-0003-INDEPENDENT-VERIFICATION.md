# ADR-0003: Independent Verification Subsystem

## Status
Accepted (Implemented)

## Context
Relying solely on an external executor's claimed output is vulnerable to silent bugs or malicious adversarial outputs.

## Decision
Mandate an independent verification subsystem that operates on separate evaluation logic to cross-check results.
