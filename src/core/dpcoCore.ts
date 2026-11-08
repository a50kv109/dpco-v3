/**
 * DPCO Core Pipeline Orchestrator - Revision 4 Baseline
 * 
 * Domains: Arithmetic & Discrete 2D Euclidean Geometry Only.
 * Enforces:
 * - Invariant 1: Production Isolation (effective_role === 'PRODUCTION' only in production mode).
 * - Invariant 2: Qualification and Constraint Enforcement (active evidence matching mathematical rigor).
 * - Invariant 3: Diagnostic Isolation (NEGATIVE_CONTROL confined to DIAGNOSTIC_TEST mode).
 * - 4-Phase Deterministic Admission Revocation Lifecycle.
 */

import { ResultClassifier } from './classifier';
import { ContradictionGate } from './contradiction';
import { DPCO_CORE_PASSPORTS } from './cspPassport';
import { DeterministicDispatcher } from './dispatcher';
import { BadExecutor, ExactExecutor, IExecutor, LinearSystemExecutor, MultiVarLinearExecutor, NumericalExecutor } from './executors';
import { BadGeometryExecutor, GeometryExecutor } from './geometry';
import { SandboxedExecutorWrapper } from './isolation';
import { ExecutionLedger } from './ledger';
import { ClaimVerdict, ExecStatus, PipelineStep, Task, TaskProcessResult, VerifyStatus } from './models';
import { CapabilityRegistry } from './registry';
import { ConstraintValidator } from './validation';
import { IndependentVerifier } from './verifier';

export class DPCOCore {
  readonly registry: CapabilityRegistry;
  readonly validator: ConstraintValidator;
  readonly gate: ContradictionGate;
  readonly dispatcher: DeterministicDispatcher;
  readonly verifier: IndependentVerifier;
  readonly classifier: ResultClassifier;
  readonly ledger: ExecutionLedger;
  private executors: Map<string, IExecutor> = new Map();
  private systemSolverEnabled: boolean = false;

  constructor(initialLedger?: ExecutionLedger) {
    this.registry = new CapabilityRegistry();
    this.validator = new ConstraintValidator();
    this.gate = new ContradictionGate();
    this.dispatcher = new DeterministicDispatcher(this.registry);
    this.verifier = new IndependentVerifier();
    this.classifier = new ResultClassifier();
    this.ledger = initialLedger || new ExecutionLedger();

    this.registerStandardExecutors();
  }

  registerStandardExecutors(): void {
    // 1. exact_solver (unadmitted until explicitly qualified)
    this.registry.register('exact_solver', ['solve_linear'], {
      exact_arithmetic: true,
      cost: 10,
      name: 'Exact Rational Solver',
      description: 'Arbitrary precision rational arithmetic using BigInt fraction calculus.',
      qualification_tier: 'DECLARED',
      passport: DPCO_CORE_PASSPORTS.exact_solver,
      domain: 'arithmetic.rational.linear',
    });
    this.executors.set(
      'exact_solver',
      new SandboxedExecutorWrapper(
        new ExactExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 2000 },
        'exact_solver'
      )
    );

    // 2. num_solver (unadmitted until explicitly qualified)
    this.registry.register('num_solver', ['solve_linear'], {
      exact_arithmetic: false,
      cost: 5,
      name: 'Numerical Floating-Point Solver',
      description: 'Standard IEEE-754 hardware floating-point solver with tolerance checks.',
      qualification_tier: 'DECLARED',
      passport: DPCO_CORE_PASSPORTS.num_solver,
      domain: 'arithmetic.float.linear',
    });
    this.executors.set(
      'num_solver',
      new SandboxedExecutorWrapper(
        new NumericalExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 1000 },
        'num_solver'
      )
    );

    // 3. test_bad_solver (NEGATIVE_CONTROL, OP.TR.DATA)
    this.registry.register('test_bad_solver', ['solve_linear'], {
      exact_arithmetic: true,
      cost: 99,
      is_test: true,
      name: 'Bad Test Solver (Adversarial)',
      description: 'Controlled adversarial executor returning corrupted roots to test verifier defense.',
      qualification_tier: 'DECLARED',
      passport: DPCO_CORE_PASSPORTS.test_bad_solver,
      domain: 'arithmetic.rational.linear',
    });
    this.executors.set(
      'test_bad_solver',
      new SandboxedExecutorWrapper(
        new BadExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 1000 },
        'test_bad_solver'
      )
    );

    // 4. geometry_solver (PRODUCTION, OP.AN.DATA)
    this.registry.register(
      'geometry_solver',
      [
        'intersect_lines',
        'verify_point_on_line',
        'verify_point_on_circle',
        'verify_tangency',
        'intersect_line_circle',
      ],
      {
        exact_arithmetic: true,
        cost: 20,
        name: 'Deterministic 2D Geometry Engine',
        description: 'Exact rational arithmetic discrete Euclidean geometry solver.',
        qualification_tier: 'DECLARED',
        passport: DPCO_CORE_PASSPORTS.geometry_solver,
        domain: 'geometry.2d.euclidean',
      }
    );
    this.executors.set(
      'geometry_solver',
      new SandboxedExecutorWrapper(
        new GeometryExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 3000 },
        'geometry_solver'
      )
    );

    // 5. bad_geometry_solver (NEGATIVE_CONTROL, OP.AN.DATA)
    this.registry.register(
      'bad_geometry_solver',
      [
        'intersect_lines',
        'verify_point_on_line',
        'verify_point_on_circle',
        'verify_tangency',
        'intersect_line_circle',
      ],
      {
        exact_arithmetic: false,
        cost: 999,
        is_test: true,
        name: 'Adversarial Bad Geometry Engine',
        description: 'Controlled adversarial geometry executor returning corrupted points.',
        qualification_tier: 'DECLARED',
        passport: DPCO_CORE_PASSPORTS.bad_geometry_solver,
        domain: 'geometry.2d.euclidean',
      }
    );
    this.executors.set(
      'bad_geometry_solver',
      new SandboxedExecutorWrapper(
        new BadGeometryExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 1000 },
        'bad_geometry_solver'
      )
    );

    if (this.systemSolverEnabled) {
      this.enableSystemSolver();
    }
  }

  enableSystemSolver(): void {
    this.systemSolverEnabled = true;
    this.registry.register('linear_system_solver', ['solve_system'], {
      exact_arithmetic: true,
      cost: 15,
      name: 'Linear System Solver (v0.2)',
      description: 'Exact rational solver for linear equation systems passing contradiction gate.',
      qualification_tier: 'DECLARED',
      passport: DPCO_CORE_PASSPORTS.linear_system_solver,
      domain: 'arithmetic.rational.system',
    });
    this.executors.set(
      'linear_system_solver',
      new SandboxedExecutorWrapper(
        new LinearSystemExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 2500 },
        'linear_system_solver'
      )
    );
  }

  disableSystemSolver(): void {
    this.systemSolverEnabled = false;
    this.registry.register('linear_system_solver', [], { cost: 999 });
    this.executors.delete('linear_system_solver');
  }

  isSystemSolverEnabled(): boolean {
    return this.systemSolverEnabled;
  }

  /** Grok Edition: enable exact multi-variable linear solver over Q */
  /**
   * Grok Edition (Pass 2): register multi-var solver.
   *    * Qualification remains DECLARED, with no automatic evidence or AdmissionGrant.
   * Effective role remains UNCLASSIFIED until explicit evidence and grant are supplied.
   * Use execution_mode: 'DIAGNOSTIC_TEST' or issue a grant for controlled production use.
   */
  enableMultiVarSolver(): void {
    this.systemSolverEnabled = true;
    this.registry.register('multivar_linear_solver', ['solve_system'], {
      exact_arithmetic: true,
      cost: 12,
      name: 'Multi-Variable Exact Linear Solver (Grok)',
      description: 'Exact Gaussian elimination over Fraction/BigInt. Accepts matrix+rhs or legacy eqs. Qualification: DECLARED.',
      qualification_tier: 'DECLARED',
      domain: 'arithmetic.rational.linear_system',
    });
    this.executors.set(
      'multivar_linear_solver',
      new SandboxedExecutorWrapper(
        new MultiVarLinearExecutor(),
        { tier: 'BUILTIN_TRUSTED', timeoutMs: 5000 },
        'multivar_linear_solver'
      )
    );
  }

  registerCustomExecutor(id: string, capabilities: string[], props: any, executor: IExecutor): void {
    this.registry.register(id, capabilities, props);
    this.executors.set(
      id,
      new SandboxedExecutorWrapper(
        executor,
        { tier: props.isolation_tier || 'BUILTIN_TRUSTED', timeoutMs: props.timeout_ms || 2000 },
        id
      )
    );
  }

  processTask(task: Task, forceExecutor?: string | null): TaskProcessResult {
    const steps: PipelineStep[] = [];
    const log: Record<string, any> = {
      task_id: task.id,
      operation: task.operation,
      params: task.params,
      claim: task.claim,
      constraints: task.constraints || {},
      reason: null,
      grant_id: null,
      effective_role: null,
      evidence_ids_used: [],
      isolation_tier: 'BUILTIN_TRUSTED',
    };

    // --- STEP 1: Constraint Validation ---
    const [isValid, validReason] = this.validator.validate(task);
    if (!isValid) {
      steps.push({
        step: 'validation',
        name: 'Constraint Validation',
        passed: false,
        blocked: true,
        details: validReason,
        timestamp: Date.now(),
        data: { reason: validReason },
      });
      log.reason = validReason;
      return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
    }
    steps.push({
      step: 'validation',
      name: 'Constraint Validation',
      passed: true,
      details: 'All parameters, equation structure, and coefficients are finite & valid.',
      timestamp: Date.now(),
    });

    // --- STEP 2: Contradiction Gate ---
    const [hasContradiction, contraReason, contraPair] = this.gate.check(task);
    if (hasContradiction) {
      steps.push({
        step: 'contradiction_gate',
        name: 'Contradiction Gate',
        passed: false,
        blocked: true,
        details: contraReason,
        timestamp: Date.now(),
        data: { reason: contraReason, contradictionPair: contraPair },
      });
      log.reason = contraReason;
      return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
    }
    steps.push({
      step: 'contradiction_gate',
      name: 'Contradiction Gate',
      passed: true,
      details: task.operation === 'solve_system'
        ? 'Pairwise consistency check passed: No mutually exclusive equations detected.'
        : 'Scalar/geometry operation: No contradiction gating required.',
      timestamp: Date.now(),
    });

    // --- STEP 3: Capability Registry, Security Invariants & Dispatch ---
    let execId: string | null = null;
    const isDiagnostic = task.execution_mode === 'DIAGNOSTIC_TEST';

    if (forceExecutor) {
      // Invariant 3: force_executor cannot bypass diagnostic confinement
      const effectiveRole = this.registry.getEffectiveRole(forceExecutor);
      if (effectiveRole === 'NEGATIVE_CONTROL' && !isDiagnostic) {
        const breachMsg = `SECURITY_INVARIANT_BREACH: Negative control '${forceExecutor}' cannot be executed outside of an authorized diagnostic test harness.`;
        steps.push({
          step: 'registry_dispatch',
          name: 'Security Invariant Check',
          passed: false,
          blocked: true,
          details: breachMsg,
          timestamp: Date.now(),
        });
        log.reason = breachMsg;
        log.effective_role = effectiveRole;
        return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
      }

      // Phase 1 Revocation Check on forced executor
      const grant = this.registry.getActiveGrant(forceExecutor);
      if (!grant && effectiveRole !== 'PRODUCTION' && !isDiagnostic) {
        const fullReason = `FORCED_EXECUTOR_REJECTED: ADMISSION_POLICY_VIOLATION: Executor '${forceExecutor}' has no active grant (role: ${effectiveRole})`;
        steps.push({
          step: 'registry_dispatch',
          name: 'Forced Executor Dispatch',
          passed: false,
          blocked: true,
          details: fullReason,
          timestamp: Date.now(),
        });
        log.reason = fullReason;
        log.effective_role = effectiveRole;
        return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
      }

      const [compatible, compatReason] = this.registry.isCompatible(task, forceExecutor);
      if (!compatible) {
        const fullReason = `FORCED_EXECUTOR_REJECTED: ${compatReason}`;
        steps.push({
          step: 'registry_dispatch',
          name: 'Forced Executor Dispatch',
          passed: false,
          blocked: true,
          details: fullReason,
          timestamp: Date.now(),
          data: { forceExecutor, compatReason },
        });
        log.reason = fullReason;
        return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
      }
      execId = forceExecutor;
      steps.push({
        step: 'registry_dispatch',
        name: 'Forced Executor Selection',
        passed: true,
        details: `Forced executor '${execId}' passed unified security & compatibility checks.`,
        timestamp: Date.now(),
        data: { selectedExecutor: execId, mode: 'forced' },
      });
    } else {
      // Deterministic Dispatch under Invariants 1 & 2
      execId = this.dispatcher.dispatch(task);
      if (!execId) {
        const fullReason = 'CAPABILITY_GAP';
        steps.push({
          step: 'registry_dispatch',
          name: 'Deterministic Dispatcher',
          passed: false,
          blocked: true,
          details: 'CAPABILITY_GAP: No compatible or qualified executor admitted for this task specification.',
          timestamp: Date.now(),
          data: { reason: fullReason },
        });
        log.reason = fullReason;
        return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
      }

      const execMeta = this.registry.getExecutor(execId);
      steps.push({
        step: 'registry_dispatch',
        name: 'Deterministic Dispatcher',
        passed: true,
        details: `Dispatched to '${execId}' (effective_role: ${execMeta?.props.effective_role}, cost: ${execMeta?.props.cost ?? 'N/A'}).`,
        timestamp: Date.now(),
        data: { selectedExecutor: execId, effective_role: execMeta?.props.effective_role },
      });
    }

    log.executor = execId;
    const activeGrant = this.registry.getActiveGrant(execId);
    log.grant_id = activeGrant?.grant_id || null;
    log.effective_role = this.registry.getEffectiveRole(execId);

    // Active evidence tracking
    const activeEvs = this.registry.evidenceRegistry.getExecutorEvidences(execId);
    log.evidence_ids_used = activeEvs.map((e) => e.evidence_id);

    const executorInstance = this.executors.get(execId);
    if (!executorInstance) {
      log.reason = `UNKNOWN_EXECUTOR_INSTANCE: ${execId}`;
      return this._finalize(log, ExecStatus.FAILED, VerifyStatus.NOT_APPLICABLE, ClaimVerdict.UNKNOWN, steps);
    }

    // --- STEP 4: Execution (with Phase 2 In-Execution Check) ---
    const startTime = performance.now();
    const result = executorInstance.execute(task);
    const duration = Math.round((performance.now() - startTime) * 100) / 100;
    log.exec_time_ms = duration;
    log.executor_root = result.x !== null && result.x !== undefined ? String(result.x) : null;
    if (result.systemSolution) { (log as any).systemSolution = result.systemSolution; }
    log.geometry_result = result.geometryResult || null;

    if (result.error) {
      steps.push({
        step: 'execution',
        name: 'Executor Execution',
        passed: false,
        details: `Execution failed with error: ${result.error}`,
        timestamp: Date.now(),
        data: { error: result.error, durationMs: duration },
      });
      log.reason = result.error;
      return this._finalize(log, ExecStatus.FAILED, VerifyStatus.NOT_APPLICABLE, ClaimVerdict.UNKNOWN, steps);
    }

    steps.push({
      step: 'execution',
      name: 'Executor Execution',
      passed: true,
      details: `Execution successful by '${execId}' in ${duration}ms.`,
      timestamp: Date.now(),
      data: { root: result.x, geometry: result.geometryResult, durationMs: duration },
    });

    // --- Phase 3 Revocation Gate (Post-Execution, Pre-Verification) ---
    // If the admission grant was revoked while or right after execution finished:
    const postExecGrant = this.registry.getActiveGrant(execId);
    if (log.grant_id && !postExecGrant && !isDiagnostic) {
      const revokeMsg = `RESULT_REJECTED_GRANT_REVOKED: Admission grant '${log.grant_id}' was revoked prior to verification. Pipeline halted.`;
      steps.push({
        step: 'independent_verification',
        name: 'Revocation Gate Check',
        passed: false,
        blocked: true,
        details: revokeMsg,
        timestamp: Date.now(),
      });
      log.reason = revokeMsg;
      log.revocation_event = 'PRE_VERIFICATION_REVOCATION_REJECTED';
      return this._finalize(log, ExecStatus.BLOCKED, VerifyStatus.UNVERIFIED, ClaimVerdict.UNKNOWN, steps);
    }

    // --- STEP 5: Independent Verification ---
    const [verifyStatus, claimVerdict, verifyMeta] = this.verifier.verify(task, result, execId);
    if (verifyStatus === VerifyStatus.UNVERIFIED) {
      log.reason = verifyMeta.details || 'ROOT_VERIFICATION_FAILED';
      steps.push({
        step: 'independent_verification',
        name: 'Independent Verifier',
        passed: false,
        details: verifyMeta.details || 'ROOT_VERIFICATION_FAILED: Proposed output failed independent check.',
        timestamp: Date.now(),
        data: { root: result.x, ...verifyMeta },
      });
    } else {
      steps.push({
        step: 'independent_verification',
        name: 'Independent Verifier',
        passed: true,
        details: verifyMeta.details || 'Output strictly verified against governing relations.',
        timestamp: Date.now(),
        data: { root: result.x, claimVerdict, ...verifyMeta },
      });
    }

    // --- Phase 4 Post-Verification Historic Audit Flagging ---
    const finalGrant = this.registry.getActiveGrant(execId);
    if (log.grant_id && !finalGrant) {
      log.historical_admission_revoked = true;
      log.revocation_event = 'POST_VERIFICATION_HISTORICAL_AUDIT_REQUIRED';
    }

    // --- STEP 6: Result Classification & Ledger Commit ---
    return this._finalize(log, ExecStatus.SUCCESS, verifyStatus, claimVerdict, steps);
  }

  private _finalize(
    log: Record<string, any>,
    execStatus: ExecStatus,
    verifyStatus: VerifyStatus,
    claimVerdict: ClaimVerdict,
    steps: PipelineStep[]
  ): TaskProcessResult {
    const [finalExec, finalClaim, finalVerify] = this.classifier.classify(
      execStatus,
      verifyStatus,
      claimVerdict
    );

    log.final_executionStatus = finalExec;
    log.final_claimVerdict = finalClaim;
    log.final_verificationStatus = finalVerify;

    steps.push({
      step: 'classifier',
      name: 'Tri-State Result Classifier',
      passed: true,
      details: `ExecStatus=${finalExec} | ClaimVerdict=${finalClaim} | VerifyStatus=${finalVerify}`,
      timestamp: Date.now(),
      data: {
        final_executionStatus: finalExec,
        final_claimVerdict: finalClaim,
        final_verificationStatus: finalVerify,
      },
    });

    // --- STEP 7: Execution Ledger Commit ---
    const ledgerRecord = this.ledger.append(log as any);
    steps.push({
      step: 'ledger',
      name: 'Tamper-Evident Ledger Commit',
      passed: true,
      details: `Record committed to block #${ledgerRecord.block_index} (hash: ${ledgerRecord.record_hash?.slice(0, 10)}...).`,
      timestamp: Date.now(),
      data: {
        block_index: ledgerRecord.block_index,
        record_hash: ledgerRecord.record_hash,
      },
    });

    return {
      log: ledgerRecord,
      steps,
    };
  }
}
