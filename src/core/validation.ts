import { Fraction } from './fraction';
import { Task } from './models';

function asFraction(value: any): Fraction {
  if (typeof value === 'boolean') throw new Error('boolean is not a numeric coefficient');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('coefficient must be finite');
  return Fraction.from(value);
}

export class ConstraintValidator {
  validate(task: Task): [boolean, string] {
    if (task.operation !== 'solve_linear' && task.operation !== 'solve_system') {
      return [true, ''];
    }
    if (!task.params || typeof task.params !== 'object' || Array.isArray(task.params)) {
      return [false, 'VALIDATION_ERROR: params must be an object'];
    }

    // Multi-var matrix form (Grok)
    if (task.operation === 'solve_system' && task.params.matrix && task.params.rhs) {
      const matrix = task.params.matrix;
      const rhs = task.params.rhs;
      if (!Array.isArray(matrix) || matrix.length === 0) return [false, 'VALIDATION_ERROR: matrix must be non-empty'];
      if (!Array.isArray(rhs) || rhs.length !== matrix.length) return [false, 'VALIDATION_ERROR: rhs length must match matrix rows'];
      const nCols = matrix[0]?.length;
      if (typeof nCols !== 'number' || nCols < 1) return [false, 'VALIDATION_ERROR: matrix rows must be non-empty'];
      for (let i = 0; i < matrix.length; i++) {
        if (!Array.isArray(matrix[i]) || matrix[i].length !== nCols) return [false, `VALIDATION_ERROR: matrix row ${i} inconsistent`];
        for (let j = 0; j < nCols; j++) {
          try { asFraction(matrix[i][j]); } catch { return [false, `VALIDATION_ERROR: matrix[${i}][${j}] not finite numeric`]; }
        }
        try { asFraction(rhs[i]); } catch { return [false, `VALIDATION_ERROR: rhs[${i}] not finite numeric`]; }
      }
      return [true, ''];
    }

    // Legacy 1-var
    let equations: any[] = [];
    if (task.operation === 'solve_linear') {
      equations = [task.params];
    } else {
      equations = task.params.eqs;
      if (!Array.isArray(equations) || equations.length === 0) {
        return [false, 'VALIDATION_ERROR: eqs must be a non-empty list (or provide matrix+rhs)'];
      }
    }
    for (let index = 0; index < equations.length; index++) {
      const equation = equations[index];
      const label = task.operation === 'solve_system' ? ` in eq ${index}` : '';
      if (!equation || typeof equation !== 'object' || Array.isArray(equation)) {
        return [false, `VALIDATION_ERROR: equation${label} must be an object`];
      }
      for (const key of ['a', 'b', 'c'] as const) {
        if (!(key in equation)) return [false, `VALIDATION_ERROR: missing coefficient '${key}'${label}`];
        try { asFraction(equation[key]); } catch {
          return [false, `VALIDATION_ERROR: coefficient '${key}' must be finite numeric${label}`];
        }
      }
      try {
        if (asFraction(equation['a']).isZero()) return [false, `VALIDATION_ERROR: coefficient 'a' cannot be zero${label}`];
      } catch {
        return [false, `VALIDATION_ERROR: coefficient 'a' must be finite numeric${label}`];
      }
    }
    return [true, ''];
  }
}
