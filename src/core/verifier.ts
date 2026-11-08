/**
 * DPCO Independent Verifier - Revision 4 Baseline
 * 
 * Domains:
 * 1. Arithmetic: Univariate linear equations and multi-equation systems over field Q.
 * 2. Geometry: Discrete 2D Euclidean geometry (incidence, intersections, tangency).
 * 
 * Epistemic Boundary Notice:
 * In this single-process implementation, both ExactExecutor and IndependentVerifier
 * utilize fraction.ts for rational operations. This is documented as a common-mode risk:
 * an arithmetic defect in fraction.ts would affect both modules identically.
 * Full formal independence requires an isolated external oracle (e.g. Phase 2 SOL-Triad).
 */

import { Fraction } from './fraction';
import { verifyLinearSolutionByResidual } from './multiVarVerify';
import { verifyGeometryExecution } from './geometry';
import { ClaimVerdict, ExecutionResult, Task, VerifyStatus } from './models';

function isClose(a: number, b: number, relTol = 1e-5, absTol = 1e-9): boolean {
  return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), absTol);
}

export class IndependentVerifier {
  verify(
    task: Task,
    result: ExecutionResult,
    execId: string
  ): [VerifyStatus, ClaimVerdict, { rootIsValid: boolean; claimIsTrue?: boolean; details?: string }] {
    if (result.error) {
      return [
        VerifyStatus.NOT_APPLICABLE,
        ClaimVerdict.UNKNOWN,
        { rootIsValid: false, details: `Execution error: ${result.error}` },
      ];
    }

    // Geometry Domain Delegation
    if (
      task.operation.startsWith('intersect_') ||
      task.operation.startsWith('verify_point_') ||
      task.operation === 'verify_tangency'
    ) {
      const geoCheck = verifyGeometryExecution(task, result);
      const claimVerdictEnum = 
        geoCheck.claimVerdict === 'TRUE' ? ClaimVerdict.TRUE :
        geoCheck.claimVerdict === 'FALSE' ? ClaimVerdict.FALSE :
        geoCheck.claimVerdict === 'NOT_APPLICABLE' ? ClaimVerdict.NOT_APPLICABLE :
        ClaimVerdict.UNKNOWN;

      return [
        geoCheck.verified ? VerifyStatus.VERIFIED : VerifyStatus.UNVERIFIED,
        claimVerdictEnum,
        {
          rootIsValid: geoCheck.verified,
          claimIsTrue: geoCheck.claimVerdict === 'TRUE',
          details: geoCheck.details,
        },
      ];
    }

    // Multi-variable matrix form (Grok Edition) — independent residual check
    if (
      task.operation === 'solve_system' &&
      task.params?.matrix &&
      task.params?.rhs &&
      result.systemSolution &&
      typeof result.systemSolution === 'object'
    ) {
      const residual = verifyLinearSolutionByResidual(
        task.params.matrix,
        task.params.rhs,
        result.systemSolution as Record<string, string | number>
      );
      return [
        residual.verified ? VerifyStatus.VERIFIED : VerifyStatus.UNVERIFIED,
        ClaimVerdict.NOT_APPLICABLE,
        { rootIsValid: residual.verified, details: residual.details },
      ];
    }

    // Arithmetic Domain Verification (univariate / legacy)
    if (result.x === null || result.x === undefined) {
      return [
        VerifyStatus.NOT_APPLICABLE,
        ClaimVerdict.UNKNOWN,
        { rootIsValid: false, details: 'Execution produced no root to verify.' },
      ];
    }

    let rootIsValid = false;
    let verifiedXStr = String(result.x);

    try {
      if (task.operation === 'solve_linear') {
        if (execId === 'exact_solver' || execId === 'test_bad_solver' || execId.includes('exact')) {
          const a = Fraction.from(task.params.a);
          const b = Fraction.from(task.params.b);
          const c = Fraction.from(task.params.c);
          const x = Fraction.from(result.x);
          // Check: a * x + b === c
          const computed = a.mul(x).add(b);
          rootIsValid = computed.equals(c);
          verifiedXStr = x.toString();
        } else {
          const a = Number(task.params.a);
          const b = Number(task.params.b);
          const c = Number(task.params.c);
          const x = Number(result.x);

          rootIsValid =
            [a, b, c, x].every((val) => Number.isFinite(val)) &&
            isClose(a * x + b, c, 1e-5, 1e-9);
          verifiedXStr = String(x);
        }
      } else if (task.operation === 'solve_system' && Array.isArray(task.params?.eqs)) {
        const eqs = task.params.eqs;
        const x = Fraction.from(result.x);
        rootIsValid = eqs.every((eq: any) => {
          const a = Fraction.from(eq.a);
          const b = Fraction.from(eq.b);
          const c = Fraction.from(eq.c);
          return a.mul(x).add(b).equals(c);
        });
        verifiedXStr = x.toString();
      }
    } catch (err: any) {
      return [
        VerifyStatus.UNVERIFIED,
        ClaimVerdict.UNKNOWN,
        { rootIsValid: false, details: `Verification arithmetic error: ${err?.message || err}` },
      ];
    }

    if (!rootIsValid) {
      return [
        VerifyStatus.UNVERIFIED,
        ClaimVerdict.UNKNOWN,
        { rootIsValid: false, details: 'ROOT_VERIFICATION_FAILED: Proposed root does not satisfy the governing equation.' },
      ];
    }

    // Root is verified! Now separately assess user claim if present
    if (!task.claim || !('x' in task.claim)) {
      return [
        VerifyStatus.VERIFIED,
        ClaimVerdict.NOT_APPLICABLE,
        { rootIsValid: true, details: `Root ${verifiedXStr} verified. No claim provided.` },
      ];
    }

    let claimIsTrue = false;
    try {
      if (execId === 'exact_solver' || execId === 'test_bad_solver' || execId.includes('exact') || task.operation === 'solve_system') {
        const x = Fraction.from(result.x);
        const claimX = Fraction.from(task.claim.x);
        claimIsTrue = x.equals(claimX);
      } else {
        const x = Number(result.x);
        const claimX = Number(task.claim.x);
        claimIsTrue = Number.isFinite(claimX) && isClose(x, claimX, 1e-5, 1e-9);
      }
    } catch {
      return [
        VerifyStatus.VERIFIED,
        ClaimVerdict.UNKNOWN,
        { rootIsValid: true, details: 'Root verified, but claim value could not be evaluated.' },
      ];
    }

    const verdict = claimIsTrue ? ClaimVerdict.TRUE : ClaimVerdict.FALSE;
    return [
      VerifyStatus.VERIFIED,
      verdict,
      {
        rootIsValid: true,
        claimIsTrue,
        details: `Root ${verifiedXStr} verified. User claim x=${task.claim.x} is ${verdict}.`,
      },
    ];
  }
}
