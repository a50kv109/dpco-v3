/**
 * Residual verification for multi-variable linear solutions (Pass 3).
 *
 * WHAT THIS MODULE PROVES:
 *   SOLUTION_SATISFIES_SYSTEM — exact residuals A·x − b are zero over Q.
 *
 * WHAT THIS MODULE DOES NOT PROVE:
 *   Uniqueness of the solution. Residual-zero alone does not establish rank(A)=n.
 *   UNIQUE_SOLUTION_VERIFIED requires a separate full-column-rank certificate
 *   (not computed here; must not silently re-run Gaussian elimination).
 *
 * COMMON-MODE RISK:
 *   Shares Fraction/BigInt with the executor. An arithmetic defect in fraction.ts
 *   would affect both paths. Residual formulation differs from elimination.
 */
import { Fraction } from './fraction';

export type ResidualStatus =
  | 'SOLUTION_SATISFIES_SYSTEM'  // residuals exact zero; uniqueness NOT claimed
  | 'RESIDUAL_NONZERO'
  | 'INCOMPLETE_SOLUTION'
  | 'EXTRA_COORDINATES'
  | 'MALFORMED_INPUT'
  | 'DIMENSION_MISMATCH';

export interface ResidualVerificationResult {
  verified: boolean;
  /** @deprecated use status === 'SOLUTION_SATISFIES_SYSTEM' */
  satisfiesSystem: boolean;
  maxResidual: string;
  details: string;
  status: ResidualStatus;
  /** Explicit epistemic bound */
  proves_uniqueness: false;
}

function tryFraction(val: unknown): Fraction | null {
  try {
    if (val === null || val === undefined) return null;
    if (typeof val === 'boolean') return null;
    if (typeof val === 'number' && !Number.isFinite(val)) return null;
    return Fraction.from(val as any);
  } catch {
    return null;
  }
}

/**
 * Verify A·x − b ≡ 0 over Q for a complete solution vector.
 * Does NOT establish uniqueness.
 */
export function verifyLinearSolutionByResidual(
  matrix: (number | string | bigint)[][],
  rhs: (number | string | bigint)[],
  solution: Record<string, string | number>
): ResidualVerificationResult {
  const fail = (
    status: ResidualStatus,
    details: string
  ): ResidualVerificationResult => ({
    verified: false,
    satisfiesSystem: false,
    maxResidual: 'n/a',
    details,
    status,
    proves_uniqueness: false,
  });

  try {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return fail('MALFORMED_INPUT', 'Matrix is empty or not an array');
    }
    if (!Array.isArray(rhs)) {
      return fail('MALFORMED_INPUT', 'RHS is not an array');
    }
    const nRows = matrix.length;
    const nCols = matrix[0]?.length ?? 0;
    if (nCols < 1) {
      return fail('MALFORMED_INPUT', 'Matrix has zero columns');
    }
    if (rhs.length !== nRows) {
      return fail('DIMENSION_MISMATCH', `RHS length ${rhs.length} != matrix rows ${nRows}`);
    }
    if (!solution || typeof solution !== 'object' || Array.isArray(solution)) {
      return fail('MALFORMED_INPUT', 'Solution is not a plain object');
    }

    const expectedKeys = Array.from({ length: nCols }, (_, j) => `x${j}`);
    const actualKeys = Object.keys(solution);
    const missing = expectedKeys.filter((k) => !(k in solution));
    const extra = actualKeys.filter((k) => !expectedKeys.includes(k));

    if (missing.length > 0) {
      return fail('INCOMPLETE_SOLUTION', `Missing coordinates: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      return fail('EXTRA_COORDINATES', `Extra coordinates: ${extra.join(', ')}`);
    }

    const x: Fraction[] = [];
    for (const key of expectedKeys) {
      const f = tryFraction(solution[key]);
      if (f === null) {
        return fail('MALFORMED_INPUT', `Invalid value for ${key}: ${JSON.stringify(solution[key])}`);
      }
      x.push(f);
    }

    let maxAbsNum = 0n;
    let maxAbsDen = 1n;
    for (let i = 0; i < nRows; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== nCols) {
        return fail('MALFORMED_INPUT', `Matrix row ${i} inconsistent length`);
      }
      let acc = new Fraction(0n, 1n);
      for (let j = 0; j < nCols; j++) {
        const aij = tryFraction(matrix[i][j]);
        if (aij === null) {
          return fail('MALFORMED_INPUT', `Non-finite matrix[${i}][${j}]`);
        }
        acc = acc.add(aij.mul(x[j]));
      }
      const bi = tryFraction(rhs[i]);
      if (bi === null) {
        return fail('MALFORMED_INPUT', `Non-finite rhs[${i}]`);
      }
      const residual = acc.sub(bi);
      if (residual.num !== 0n) {
        const absNum = residual.num < 0n ? -residual.num : residual.num;
        if (absNum * maxAbsDen > maxAbsNum * residual.den) {
          maxAbsNum = absNum;
          maxAbsDen = residual.den;
        }
      }
    }

    const zero = maxAbsNum === 0n;
    return {
      verified: zero,
      satisfiesSystem: zero,
      maxResidual: zero ? '0' : `${maxAbsNum}/${maxAbsDen}`,
      details: zero
        ? 'Residuals exact zero over Q. Proves SOLUTION_SATISFIES_SYSTEM only — uniqueness NOT established by residual check.'
        : `Non-zero residual (max |r| ≈ ${maxAbsNum}/${maxAbsDen}).`,
      status: zero ? 'SOLUTION_SATISFIES_SYSTEM' : 'RESIDUAL_NONZERO',
      proves_uniqueness: false,
    };
  } catch (e: any) {
    return fail('MALFORMED_INPUT', e?.message || String(e));
  }
}
