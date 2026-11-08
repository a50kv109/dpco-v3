import { Fraction } from './fraction';
import { ExecutionResult, Task } from './models';

export interface IExecutor {
  execute(task: Task): ExecutionResult;
}

export class ExactExecutor implements IExecutor {
  execute(task: Task): ExecutionResult {
    try {
      const a = Fraction.from(task.params.a);
      const b = Fraction.from(task.params.b);
      const c = Fraction.from(task.params.c);
      const x = c.sub(b).div(a);
      return { x: x.toString() };
    } catch (error: any) {
      return { error: error?.message || String(error) };
    }
  }
}

export class NumericalExecutor implements IExecutor {
  execute(task: Task): ExecutionResult {
    try {
      const a = Number(task.params.a);
      const b = Number(task.params.b);
      const c = Number(task.params.c);

      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
        return { error: 'coefficients must be finite' };
      }

      if (a === 0) {
        return { error: 'division by zero' };
      }

      const x = (c - b) / a;
      return { x };
    } catch (error: any) {
      return { error: error?.message || String(error) };
    }
  }
}

export class BadExecutor implements IExecutor {
  execute(_task: Task): ExecutionResult {
    // Intentionally returns corrupted root for verifier testing (T05)
    return { x: 2.0 };
  }
}

/**
 * DPCO Evolution v0.2: Exact Linear System Solver
 * Fills the CAPABILITY_GAP identified in the PoC v0.1 audit for consistent scalar systems.
 * Solves single-variable or multi-equation systems with exact rational fractions.
 */
export class LinearSystemExecutor implements IExecutor {
  execute(task: Task): ExecutionResult {
    try {
      const eqs = task.params?.eqs;
      if (!Array.isArray(eqs) || eqs.length === 0) {
        return { error: 'No equations provided in system' };
      }

      // In the supported 1-variable format: each equation is a_i * x + b_i = c_i
      // If the contradiction gate passed, all equations are consistent and share the same root!
      const firstEq = eqs[0];
      const a = Fraction.from(firstEq.a);
      const b = Fraction.from(firstEq.b);
      const c = Fraction.from(firstEq.c);
      const root = c.sub(b).div(a);

      // Double-check all other equations for consistency
      for (let i = 1; i < eqs.length; i++) {
        const ai = Fraction.from(eqs[i].a);
        const bi = Fraction.from(eqs[i].b);
        const ci = Fraction.from(eqs[i].c);
        const lhs = ai.mul(root).add(bi);
        if (!lhs.equals(ci)) {
          return { error: `Inconsistency detected at runtime in equation ${i}` };
        }
      }

      return {
        x: root.toString(),
        systemSolution: { x: root.toString() },
      };
    } catch (error: any) {
      return { error: error?.message || String(error) };
    }
  }
}

/**
 * Grok Independent Engineering Edition
 * Exact multi-variable linear solver over Q (Gaussian elimination with Fraction).
 * Accepts matrix+rhs or falls back to legacy eqs format.
 */
export class MultiVarLinearExecutor implements IExecutor {
  execute(task: Task): ExecutionResult {
    try {
      if (task.params?.matrix && task.params?.rhs) {
        return this.solveMatrix(task.params.matrix, task.params.rhs);
      }
      const eqs = task.params?.eqs;
      if (Array.isArray(eqs) && eqs.length > 0) {
        return new LinearSystemExecutor().execute(task);
      }
      return { error: 'MultiVarLinearExecutor requires params.matrix + params.rhs or legacy params.eqs' };
    } catch (error: any) {
      return { error: error?.message || String(error) };
    }
  }

  private solveMatrix(rawMatrix: any[][], rawRhs: any[]): ExecutionResult {
    if (!Array.isArray(rawMatrix)) {
      return { error: 'INVALID_INPUT: matrix must be an array of rows' };
    }
    const nRows = rawMatrix.length;
    if (nRows === 0) return { error: 'INVALID_INPUT: empty matrix' };
    if (!Array.isArray(rawMatrix[0])) {
      return { error: 'INVALID_INPUT: matrix rows must be arrays' };
    }
    const nCols = rawMatrix[0].length;
    if (nCols === 0) {
      return { error: 'INVALID_INPUT: ZERO_COLUMN_MATRIX — system has no variables' };
    }
    if (!Array.isArray(rawRhs)) {
      return { error: 'INVALID_INPUT: rhs must be an array' };
    }
    if (rawRhs.length !== nRows) {
      return { error: `INVALID_INPUT: RHS length ${rawRhs.length} != matrix rows ${nRows}` };
    }

    const A: Fraction[][] = [];
    for (let i = 0; i < nRows; i++) {
      if (rawMatrix[i].length !== nCols) return { error: `Row ${i} inconsistent length` };
      const row: Fraction[] = [];
      for (let j = 0; j < nCols; j++) row.push(Fraction.from(rawMatrix[i][j]));
      row.push(Fraction.from(rawRhs[i]));
      A.push(row);
    }

    const n = nCols;
    const m = nRows;
    let rank = 0;
    const where: number[] = new Array(n).fill(-1);

    for (let col = 0, row = 0; col < n && row < m; col++) {
      let sel = row;
      for (let i = row; i < m; i++) {
        if (A[i][col].num !== 0n) { sel = i; break; }
      }
      if (A[sel][col].num === 0n) continue;
      if (sel !== row) { const tmp = A[sel]; A[sel] = A[row]; A[row] = tmp; }
      where[col] = row;
      const pivot = A[row][col];
      for (let j = col; j <= n; j++) A[row][j] = A[row][j].div(pivot);
      for (let i = 0; i < m; i++) {
        if (i !== row && A[i][col].num !== 0n) {
          const factor = A[i][col];
          for (let j = col; j <= n; j++) A[i][j] = A[i][j].sub(factor.mul(A[row][j]));
        }
      }
      rank++; row++;
    }

    for (let i = 0; i < m; i++) {
      let allZero = true;
      for (let j = 0; j < n; j++) if (A[i][j].num !== 0n) { allZero = false; break; }
      if (allZero && A[i][n].num !== 0n) return { error: 'INCONSISTENT_SYSTEM: no solution over Q' };
    }
    if (rank < n) return { error: `UNDERDETERMINED: rank ${rank} < ${n} variables` };

    const solution: Record<string, string> = {};
    for (let j = 0; j < n; j++) {
      const r = where[j];
      solution[`x${j}`] = (r !== -1 ? A[r][n] : new Fraction(0n, 1n)).toString();
    }
    return { systemSolution: solution, x: solution['x0'] ?? null };
  }
}
