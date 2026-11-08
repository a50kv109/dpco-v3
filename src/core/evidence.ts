/**
 * DPCO Evidence Registry & Admission Grant Contract - Revision 4
 * 
 * Enforces:
 * - 5 Orthogonal Evidence Dimensions (non-convergent)
 * - Strict separation between declared claims and verified evidence
 * - Independent domain-bounded qualification records
 * - Tamper-evident AdmissionGrants with revocation tracking
 */

import { MathematicalRigorLevel } from './models';

export type EvidenceType = 
  | 'PASSPORT_DECLARED'
  | 'TEST_SUITE_PASSED'
  | 'FORMALLY_VERIFIED_INSTANCE'
  | 'FORMALLY_VERIFIED_DOMAIN'
  | 'EMPIRICALLY_VALIDATED'
  | 'EXTERNALLY_ATTESTED';

export type DpcoRole = 
  | 'UNCLASSIFIED'
  | 'PRODUCTION'
  | 'NEGATIVE_CONTROL'
  | 'BENCHMARK_ORACLE';

export interface EvidenceRecord {
  evidence_id: string;
  executor_id: string;
  evidence_type: EvidenceType;
  domain: string; // e.g. "arithmetic.rational.linear", "geometry.2d.euclidean"
  scope: string;  // Explicit boundary of applicability
  issuer: string; // Authorized testing harness, formal engine, or operator
  issued_at: string; // ISO timestamp
  expires_at?: string | null;
  revoked: boolean;
  revocation_reason?: string;
  revoked_at?: string;
  artifact_hash?: string;
  metadata?: Record<string, any>;
}

export interface AdmissionGrant {
  grant_id: string;
  executor_id: string;
  granted_role: 'PRODUCTION' | 'NEGATIVE_CONTROL' | 'BENCHMARK_ORACLE';
  authorized_by: string; // Policy ID or Security Principal
  policy_id: string;
  evidence_ids_verified: string[];
  issued_at: string;
  expires_at?: string | null;
  revoked: boolean;
  revocation_reason?: string;
  revoked_at?: string;
}

export class EvidenceRegistry {
  private evidences: Map<string, EvidenceRecord> = new Map();
  private grants: Map<string, AdmissionGrant> = new Map();

  /**
   * Registers a new evidence record.
   */
  addEvidence(evidence: EvidenceRecord): void {
    this.evidences.set(evidence.evidence_id, { ...evidence });
  }

  /**
   * Revokes an evidence record.
   */
  revokeEvidence(evidenceId: string, reason: string): boolean {
    const ev = this.evidences.get(evidenceId);
    if (!ev) return false;
    ev.revoked = true;
    ev.revocation_reason = reason;
    ev.revoked_at = new Date().toISOString();
    return true;
  }

  getEvidence(evidenceId: string): EvidenceRecord | undefined {
    return this.evidences.get(evidenceId);
  }

  getExecutorEvidences(executorId: string): EvidenceRecord[] {
    return Array.from(this.evidences.values()).filter(
      (e) => e.executor_id === executorId && !e.revoked
    );
  }

  /**
   * Issues an authorized AdmissionGrant.
   * An executor CANNOT issue a grant to itself.
   */
  issueAdmissionGrant(
    grantInput: Omit<AdmissionGrant, 'revoked' | 'revoked_at'>
  ): AdmissionGrant {
    const grant: AdmissionGrant = {
      ...grantInput,
      revoked: false,
    };
    this.grants.set(grant.grant_id, grant);
    return grant;
  }

  /**
   * Revokes an AdmissionGrant.
   */
  revokeAdmissionGrant(grantId: string, reason: string): boolean {
    const grant = this.grants.get(grantId);
    if (!grant) return false;
    grant.revoked = true;
    grant.revocation_reason = reason;
    grant.revoked_at = new Date().toISOString();
    return true;
  }

  /**
   * Retrieves active, unrevoked, unexpired grant for an executor.
   */
  getActiveGrant(executorId: string): AdmissionGrant | null {
    const now = Date.now();
    for (const grant of this.grants.values()) {
      if (grant.executor_id === executorId && !grant.revoked) {
        if (grant.expires_at) {
          const exp = new Date(grant.expires_at).getTime();
          if (now > exp) continue; // expired
        }
        return grant;
      }
    }
    return null;
  }

  getAllGrants(): AdmissionGrant[] {
    return Array.from(this.grants.values());
  }

  /**
   * Calculates effective role based on active grants.
   * Default: UNCLASSIFIED (Fail-closed).
   */
  calculateEffectiveRole(executorId: string): DpcoRole {
    const grant = this.getActiveGrant(executorId);
    if (grant) {
      return grant.granted_role;
    }
    return 'UNCLASSIFIED';
  }

  /**
   * Evaluates if executor satisfies the requested mathematical rigor level in the target domain.
   * 
   * - TESTED: requires active TEST_SUITE_PASSED
   * - INSTANCE_VERIFIED: requires at least TEST_SUITE_PASSED (pre-qualification)
   * - DOMAIN_VERIFIED: requires FORMALLY_VERIFIED_DOMAIN (finite tests NEVER satisfy this)
   */
  hasValidEvidenceForRigor(
    executorId: string,
    rigor: MathematicalRigorLevel,
    targetDomain?: string
  ): { qualified: boolean; matchedEvidenceIds: string[]; reason?: string } {
    const active = this.getExecutorEvidences(executorId);

    // Filter by domain if specified
    const inDomain = active.filter((e) => {
      if (!targetDomain) return true;
      // Domain matching: target domain starts with or equals evidence domain
      return (
        targetDomain.startsWith(e.domain) ||
        e.domain.startsWith(targetDomain) ||
        e.domain === '*'
      );
    });

    if (rigor === 'TESTED') {
      const testEvs = inDomain.filter((e) => e.evidence_type === 'TEST_SUITE_PASSED');
      if (testEvs.length > 0) {
        return {
          qualified: true,
          matchedEvidenceIds: testEvs.map((e) => e.evidence_id),
        };
      }
      return {
        qualified: false,
        matchedEvidenceIds: [],
        reason: `Missing active TEST_SUITE_PASSED evidence for domain '${targetDomain || 'any'}'.`,
      };
    }

    if (rigor === 'INSTANCE_VERIFIED') {
      // Must have empirical tested baseline or formal verification
      const baseline = inDomain.filter(
        (e) =>
          e.evidence_type === 'TEST_SUITE_PASSED' ||
          e.evidence_type === 'FORMALLY_VERIFIED_INSTANCE' ||
          e.evidence_type === 'FORMALLY_VERIFIED_DOMAIN'
      );
      if (baseline.length > 0) {
        return {
          qualified: true,
          matchedEvidenceIds: baseline.map((e) => e.evidence_id),
        };
      }
      return {
        qualified: false,
        matchedEvidenceIds: [],
        reason: `Missing active baseline verification evidence for runtime instance check in '${targetDomain}'.`,
      };
    }

    if (rigor === 'DOMAIN_VERIFIED') {
      const formalEvs = inDomain.filter(
        (e) => e.evidence_type === 'FORMALLY_VERIFIED_DOMAIN'
      );
      if (formalEvs.length > 0) {
        return {
          qualified: true,
          matchedEvidenceIds: formalEvs.map((e) => e.evidence_id),
        };
      }
      return {
        qualified: false,
        matchedEvidenceIds: [],
        reason: `Finite test suite cannot satisfy DOMAIN_VERIFIED. Missing FORMALLY_VERIFIED_DOMAIN evidence for '${targetDomain}'.`,
      };
    }

    return { qualified: false, matchedEvidenceIds: [], reason: 'Unknown rigor level.' };
  }
}

/**
 * Trusted Test Result Ingestion (Pass 3)
 *
 * Validates profile results before creating TEST_SUITE_PASSED evidence.
 * Core registration must not manufacture successful test evidence.
 *
 * Required binding fields prevent self-attestation by mere code presence.
 */
export interface TrustedTestResult {
  executor_id: string;
  domain: string;
  test_profile_id: string;       // e.g. "multivar-edge-suite-v1"
  source_revision: string;       // git SHA or package version
  environment: string;           // e.g. "node24/linux"
  passed: boolean;
  total_checks: number;
  failed_checks: number;
  executed_at: string;           // ISO timestamp of actual run
  harness_id: string;            // must be in TRUSTED_HARNESSES
  artifact_hash?: string;
  notes?: string;
}

/** Explicit allow-list of harness identities permitted to ingest evidence */
export const TRUSTED_HARNESSES = [
  'harness:dpco_builtin_suite',
  'harness:dpco_geometry_suite',
  'harness:dpco_test_harness',
  'harness:grok_edition_pass3',
] as const;

export type TrustedHarnessId = (typeof TRUSTED_HARNESSES)[number];

declare module './evidence' {
  // extension point documented for consumers
}

// Augment EvidenceRegistry with ingestion (added as methods on prototype via class reopen pattern)
// We extend the class body by patching after definition:

EvidenceRegistry.prototype.ingestTestResult = function (
  this: EvidenceRegistry,
  result: TrustedTestResult
): { accepted: boolean; evidence_id?: string; reason?: string } {
  if (!(TRUSTED_HARNESSES as readonly string[]).includes(result.harness_id)) {
    return {
      accepted: false,
      reason: `UNTRUSTED_HARNESS: '${result.harness_id}' is not in TRUSTED_HARNESSES`,
    };
  }
  if (!Number.isInteger(result.total_checks) || result.total_checks <= 0 ||
      !Number.isInteger(result.failed_checks) || result.failed_checks < 0 ||
      result.failed_checks > result.total_checks) {
    return {
      accepted: false,
      reason: 'INVALID_TEST_COUNTS: total_checks must be positive and failed_checks must be between zero and total_checks',
    };
  }
  if (!result.passed || result.failed_checks !== 0) {
    return {
      accepted: false,
      reason: `TEST_PROFILE_FAILED: ${result.failed_checks}/${result.total_checks} failed — no TEST_SUITE_PASSED evidence created`,
    };
  }
  if (
    !result.executor_id?.trim() ||
    !result.domain?.trim() ||
    !result.test_profile_id?.trim() ||
    !result.source_revision?.trim() ||
    !result.environment?.trim() ||
    !result.executed_at?.trim() ||
    !Number.isFinite(Date.parse(result.executed_at))
  ) {
    return {
      accepted: false,
      reason: 'MISSING_BINDING: executor_id, domain, test_profile_id, source_revision, environment, and valid executed_at are required',
    };
  }

  const evidence_id = `EVID-TEST-${result.executor_id}-${result.test_profile_id}-${result.source_revision.slice(0, 12)}`;
  this.addEvidence({
    evidence_id,
    executor_id: result.executor_id,
    evidence_type: 'TEST_SUITE_PASSED',
    domain: result.domain,
    scope: `Test Profile '${result.test_profile_id}' — ${result.total_checks} checks, 0 failed`,
    issuer: result.harness_id,
    issued_at: result.executed_at,
    revoked: false,
    artifact_hash: result.artifact_hash,
    metadata: {
      domain: result.domain,
      source_revision: result.source_revision,
      environment: result.environment,
      test_profile_id: result.test_profile_id,
      total_checks: result.total_checks,
      failed_checks: result.failed_checks,
      notes: result.notes,
      ingested_via: 'EvidenceRegistry.ingestTestResult',
    },
  });
  return { accepted: true, evidence_id };
};

// TypeScript declaration merge for the added method
export interface EvidenceRegistry {
  ingestTestResult(result: TrustedTestResult): { accepted: boolean; evidence_id?: string; reason?: string };
}
