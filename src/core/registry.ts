import { CspDocument, CspValidationResult, DPCO_CORE_PASSPORTS, validateCspPassport } from './cspPassport';
import { AdmissionGrant, DpcoRole, EvidenceRecord, EvidenceRegistry } from './evidence';
import { MathematicalRigorLevel, Task } from './models';

export type QualificationTier = 'DECLARED' | 'TESTED' | 'VERIFIED' | 'VALIDATED' | 'ATTESTED';

export interface ExecutorRegistration {
  capabilities: string[];
  props: {
    exact_arithmetic?: boolean;
    cost?: number;
    is_test?: boolean;
    name?: string;
    description?: string;
    qualification_tier?: QualificationTier;
    passport?: CspDocument;
    declared_role?: DpcoRole;
    effective_role?: DpcoRole;
    domain?: string;
    [key: string]: any;
  };
}

export class CapabilityRegistry {
  private executors: Map<string, ExecutorRegistration> = new Map();
  readonly evidenceRegistry: EvidenceRegistry;

  constructor(evidenceRegistry?: EvidenceRegistry) {
    this.evidenceRegistry = evidenceRegistry || new EvidenceRegistry();
  }

  /**
   * Classic DPCO v0.1 Registration API (Backward Compatible)
   * If an unknown executor is registered without an admission grant,
   * its effective role remains fail-closed 'UNCLASSIFIED'.
   */
  register(execId: string, capabilities: string[], props: ExecutorRegistration['props']): void {
    const existing = this.executors.get(execId);
    
    // Determine declared role: if props.is_test, declared as NEGATIVE_CONTROL, else PRODUCTION or UNCLASSIFIED
    const declaredRole: DpcoRole = 
      props.declared_role || 
      (props.is_test ? 'NEGATIVE_CONTROL' : 'PRODUCTION');

    this.executors.set(execId, {
      capabilities: [...capabilities],
      props: {
        qualification_tier: props.qualification_tier || 'DECLARED',
        passport: props.passport || existing?.props.passport,
        declared_role: declaredRole,
        ...props,
      },
    });
  }

  /**
   * CSP-0.2 Passport Registration API
   * Validates structure; qualification begins as DECLARED.
   * Effective role is evaluated from EvidenceRegistry grants.
   */
  registerPassport(
    execId: string,
    passportDoc: CspDocument,
    overrideProps: Partial<ExecutorRegistration['props']> = {}
  ): { success: boolean; validationResult: CspValidationResult } {
    const validationResult = validateCspPassport(passportDoc);

    if (!validationResult.valid) {
      return { success: false, validationResult };
    }

    const declaredCaps = new Set<string>();
    if (passportDoc.compatibility?.input) {
      for (const ch of passportDoc.compatibility.input) {
        if (ch.capabilities) {
          for (const cap of ch.capabilities) {
            declaredCaps.add(cap);
          }
        }
      }
    }

    const ext = passportDoc.extensions?.['dpco.execution/v1'];
    const declaredRole: DpcoRole = ext?.declared_role || (passportDoc.policy?.admission?.status === 'restricted' ? 'NEGATIVE_CONTROL' : 'UNCLASSIFIED');
    const exact = ext?.exact_arithmetic_declared === true || (passportDoc.compatibility?.constraints?.exact_arithmetic ?? false);
    const cost = ext?.declared_cost_weight ?? passportDoc.compatibility?.constraints?.cost_weight ?? 10;
    const isTest = declaredRole === 'NEGATIVE_CONTROL';

    this.executors.set(execId, {
      capabilities: Array.from(declaredCaps),
      props: {
        name: passportDoc.passport.description.slice(0, 40),
        description: passportDoc.passport.description,
        exact_arithmetic: exact,
        cost: cost,
        is_test: isTest,
        passport: passportDoc,
        declared_role: declaredRole,
        qualification_tier: overrideProps.qualification_tier || 'DECLARED',
        ...overrideProps,
      },
    });

    return { success: true, validationResult };
  }

  getEffectiveRole(execId: string): DpcoRole {
    return this.evidenceRegistry.calculateEffectiveRole(execId);
  }

  getActiveGrant(execId: string): AdmissionGrant | null {
    return this.evidenceRegistry.getActiveGrant(execId);
  }

  issueAdmissionGrant(grant: Omit<AdmissionGrant, 'revoked' | 'revoked_at'>): AdmissionGrant {
    return this.evidenceRegistry.issueAdmissionGrant(grant);
  }

  revokeAdmissionGrant(grantId: string, reason: string): boolean {
    return this.evidenceRegistry.revokeAdmissionGrant(grantId, reason);
  }

  addEvidence(evidence: EvidenceRecord): void {
    this.evidenceRegistry.addEvidence(evidence);
  }

  revokeEvidence(evidenceId: string, reason: string): boolean {
    return this.evidenceRegistry.revokeEvidence(evidenceId, reason);
  }

  hasValidEvidence(execId: string, rigor: MathematicalRigorLevel, domain?: string): boolean {
    return this.evidenceRegistry.hasValidEvidenceForRigor(execId, rigor, domain).qualified;
  }

  setQualificationTier(execId: string, tier: QualificationTier): boolean {
    const exec = this.executors.get(execId);
    if (!exec) return false;
    exec.props.qualification_tier = tier;
    return true;
  }

  getQualificationTier(execId: string): QualificationTier {
    return this.executors.get(execId)?.props.qualification_tier || 'DECLARED';
  }

  getPassport(execId: string): CspDocument | undefined {
    return this.executors.get(execId)?.props.passport;
  }

  /**
   * Evaluates if executor is compatible with task.
   * Enforces:
   * - Capability match
   * - Production admission gate (unless diagnostic mode)
   * - Mathematical rigor & active evidence verification
   * - Exact arithmetic constraint
   */
  isCompatible(task: Task, execId: string): [boolean, string] {
    const data = this.executors.get(execId);
    if (!data) {
      return [false, `UNKNOWN_EXECUTOR: ${execId}`];
    }

    if (!data.capabilities.includes(task.operation)) {
      return [false, `UNSUPPORTED_OPERATION: ${task.operation}`];
    }

    const effectiveRole = this.getEffectiveRole(execId);
    const isDiagnostic = task.execution_mode === 'DIAGNOSTIC_TEST';

    // Invariant 1: Production tasks require effective_role === 'PRODUCTION'
    if (!isDiagnostic && effectiveRole !== 'PRODUCTION') {
      return [
        false,
        `ADMISSION_POLICY_VIOLATION: Executor '${execId}' has effective_role '${effectiveRole}' and is not admitted for production dispatch.`,
      ];
    }

    // Invariant 3: NEGATIVE_CONTROL permitted ONLY in DIAGNOSTIC_TEST mode
    if (effectiveRole === 'NEGATIVE_CONTROL' && !isDiagnostic) {
      return [
        false,
        `SECURITY_INVARIANT_BREACH: Negative control '${execId}' cannot be executed outside of an authorized diagnostic test harness.`,
      ];
    }

    // Exact arithmetic constraint check
    if (task.constraints?.exact && !data.props.exact_arithmetic) {
      return [false, 'CONSTRAINT_VIOLATION: exact_arithmetic required'];
    }

    // Mathematical Rigor Requirement & Active Evidence Matching
    const requiredRigor: MathematicalRigorLevel = 
      task.constraints?.required_rigor || 
      (task.constraints?.exact ? 'INSTANCE_VERIFIED' : 'TESTED');

    const domain = task.constraints?.domain || this.inferDomain(task.operation, task.constraints?.exact);
    const evidenceEval = this.evidenceRegistry.hasValidEvidenceForRigor(execId, requiredRigor, domain);

    if (!evidenceEval.qualified) {
      return [
        false,
        `QUALIFICATION_EVIDENCE_DEFICIT: Executor '${execId}' lacks required active evidence for rigor '${requiredRigor}' in domain '${domain}': ${evidenceEval.reason}`,
      ];
    }

    return [true, ''];
  }

  /**
   * Helper to infer default domain from operation
   */
  private inferDomain(operation: string, exactConstraint?: boolean): string {
    if (operation.startsWith('intersect_') || operation.startsWith('verify_point_') || operation === 'verify_tangency') {
      return 'geometry.2d.euclidean';
    }
    if (operation === 'solve_system') {
      return 'arithmetic.rational.system';
    }
    return exactConstraint ? 'arithmetic.rational.linear' : 'arithmetic.linear';
  }

  /**
   * Dispatches candidates. Filters out non-production executors in production mode.
   */
  getCandidates(task: Task): string[] {
    const candidates: string[] = [];
    for (const [execId] of this.executors.entries()) {
      const [compatible] = this.isCompatible(task, execId);
      if (compatible) {
        candidates.push(execId);
      }
    }
    return candidates;
  }

  getAllExecutors(): Array<{ id: string; capabilities: string[]; props: ExecutorRegistration['props'] }> {
    return Array.from(this.executors.entries()).map(([id, data]) => ({
      id,
      capabilities: data.capabilities,
      props: {
        ...data.props,
        effective_role: this.getEffectiveRole(id),
      },
    }));
  }

  getExecutor(execId: string): ExecutorRegistration | undefined {
    const data = this.executors.get(execId);
    if (!data) return undefined;
    return {
      ...data,
      props: {
        ...data.props,
        effective_role: this.getEffectiveRole(execId),
      },
    };
  }
}
