# DPCO Discussion & Architecture Review Guide

## Purpose
This document guides architecture discussions and peer reviews between developers, researchers, and AI agents evaluating DPCO.

## Key Discussion Topics
1. **Epistemic Separation:** How does the proposed change preserve the separation between execution success and verification truth?
2. **Adapter Trust Boundaries:** Does the adapter attempt to self-declare qualifications or isolation levels?
3. **Deterministic Dispatch:** Is candidate sorting deterministic and cost-aware?
4. **Independent Verification:** Does the verifier operate on independent logic from the producer tool?
