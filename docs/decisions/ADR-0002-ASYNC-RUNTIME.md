# ADR-0002: Asynchronous Runtime Contract (DEAS-1)

## Status
Accepted (Designed)

## Context
External executors may experience network latency, file I/O delays, or long computations. Synchronous interfaces block the Event Loop.

## Decision
Introduce `IDeasExecutor` with asynchronous `executeTask()` promises while preserving built-in synchronous `IExecutor` reference engines via a dedicated async bridge architecture.
