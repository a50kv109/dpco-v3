# ADR-0005: Artifact Security and SSRF Defense

## Status
Accepted (Designed)

## Context
Exchanging binary files and structured results across external executors introduces path traversal and SSRF vulnerabilities.

## Decision
Restrict artifact URIs to data://, sandbox file://, and cas://; enforce path traversal checks and SHA-256 content hash verification.
