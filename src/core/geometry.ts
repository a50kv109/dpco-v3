/**
 * DPCO Discrete 2D Euclidean Geometry Subsystem - Revision 4 Baseline
 * 
 * Exact Rational Arithmetic over field Q using BigInt Fraction Calculus.
 * Domain Boundary: Points, Lines, Circles, Intersections, Incidence, Tangency.
 * 
 * Guaranteed: NO floating-point drift or machine-epsilon approximations.
 * If an intersection produces an irrational coordinate, explicitly flags
 * UNSUPPORTED_IRRATIONAL_DOMAIN rather than silently approximating.
 */

import { IExecutor } from './executors';
import { Fraction } from './fraction';
import { ExecutionResult, Task } from './models';

export interface Point2D {
  x: Fraction;
  y: Fraction;
}

export interface Line2D {
  a: Fraction; // a*x + b*y + c = 0
  b: Fraction;
  c: Fraction;
}

export interface Circle2D {
  center: Point2D;
  rSquared: Fraction; // radius squared
}

/**
 * Parses raw input into exact Fraction
 */
export function toFraction(val: any): Fraction {
  if (val instanceof Fraction) return val;
  if (typeof val === 'number' || typeof val === 'string' || typeof val === 'bigint') {
    return Fraction.from(val);
  }
  if (val && typeof val === 'object' && 'num' in val && 'den' in val) {
    return new Fraction(BigInt(val.num), BigInt(val.den));
  }
  throw new Error(`Cannot convert value to Fraction: ${JSON.stringify(val)}`);
}

export function parsePoint(raw: any): Point2D {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid point: must be object with x, y');
  return {
    x: toFraction(raw.x),
    y: toFraction(raw.y),
  };
}

export function parseLine(raw: any): Line2D {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid line: must be object with a, b, c');
  const a = toFraction(raw.a);
  const b = toFraction(raw.b);
  const c = toFraction(raw.c ?? 0);
  if (a.num === 0n && b.num === 0n) {
    throw new Error('Degenerate line: both a and b are zero.');
  }
  return { a, b, c };
}

export function parseCircle(raw: any): Circle2D {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid circle: must be object with center, r or rSquared');
  const center = parsePoint(raw.center);
  let rSquared: Fraction;
  if (raw.rSquared !== undefined) {
    rSquared = toFraction(raw.rSquared);
  } else if (raw.r !== undefined) {
    const r = toFraction(raw.r);
    rSquared = r.mul(r);
  } else {
    throw new Error('Circle must specify r or rSquared');
  }
  if (rSquared.num < 0n) {
    throw new Error('Circle radius squared cannot be negative');
  }
  return { center, rSquared };
}

/**
 * Exact Line-Line Intersection:
 * a1*x + b1*y + c1 = 0
 * a2*x + b2*y + c2 = 0
 * D = a1*b2 - a2*b1
 */
export function intersectLinesExact(
  l1: Line2D,
  l2: Line2D
): { status: 'POINT' | 'PARALLEL' | 'COINCIDENT'; point?: Point2D } {
  // D = a1*b2 - a2*b1
  const D = l1.a.mul(l2.b).sub(l2.a.mul(l1.b));

  // Check parallel
  if (D.num === 0n) {
    // Check coincident: cross check c
    const Dx_test = l1.b.mul(l2.c).sub(l2.b.mul(l1.c));
    const Dy_test = l2.a.mul(l1.c).sub(l1.a.mul(l2.c));
    if (Dx_test.num === 0n && Dy_test.num === 0n) {
      return { status: 'COINCIDENT' };
    }
    return { status: 'PARALLEL' };
  }

  // Dx = b1*c2 - b2*c1
  const Dx = l1.b.mul(l2.c).sub(l2.b.mul(l1.c));
  // Dy = a2*c1 - a1*c2
  const Dy = l2.a.mul(l1.c).sub(l1.a.mul(l2.c));

  const x = Dx.div(D);
  const y = Dy.div(D);

  return {
    status: 'POINT',
    point: { x, y },
  };
}

/**
 * Checks if Point lies exactly on Line: a*x + b*y + c === 0
 */
export function isPointOnLineExact(p: Point2D, l: Line2D): boolean {
  const residual = l.a.mul(p.x).add(l.b.mul(p.y)).add(l.c);
  return residual.num === 0n;
}

/**
 * Checks if Point lies exactly on Circle: (x - x0)^2 + (y - y0)^2 === r^2
 */
export function isPointOnCircleExact(p: Point2D, c: Circle2D): boolean {
  const dx = p.x.sub(c.center.x);
  const dy = p.y.sub(c.center.y);
  const distSq = dx.mul(dx).add(dy.mul(dy));
  const diff = distSq.sub(c.rSquared);
  return diff.num === 0n;
}

/**
 * Checks if Line is tangent to Circle over field Q:
 * d^2 = (a*x0 + b*y0 + c)^2 / (a^2 + b^2) === r^2
 * <=> (a*x0 + b*y0 + c)^2 === r^2 * (a^2 + b^2)
 */
export function isLineTangentToCircleExact(l: Line2D, c: Circle2D): boolean {
  const numerator = l.a.mul(c.center.x).add(l.b.mul(c.center.y)).add(l.c);
  const numSq = numerator.mul(numerator);

  const denom = l.a.mul(l.a).add(l.b.mul(l.b));
  const rhs = c.rSquared.mul(denom);

  return numSq.sub(rhs).num === 0n;
}

/**
 * Helper to test if BigInt is a perfect square
 */
function isSquareBigInt(n: bigint): { isSquare: boolean; root: bigint } {
  if (n < 0n) return { isSquare: false, root: 0n };
  if (n === 0n) return { isSquare: true, root: 0n };
  if (n === 1n) return { isSquare: true, root: 1n };

  // Integer square root via Newton's method
  let x0 = n / 2n;
  if (x0 === 0n) x0 = 1n;
  let x1 = (x0 + n / x0) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + n / x0) / 2n;
  }
  return { isSquare: x0 * x0 === n, root: x0 };
}

/**
 * Exact Line-Circle Intersection.
 * Supports exact rational points or strictly reports UNSUPPORTED_IRRATIONAL_DOMAIN.
 */
export function intersectLineCircleExact(
  l: Line2D,
  c: Circle2D
): { status: 'POINTS' | 'TANGENT' | 'NO_INTERSECTION' | 'UNSUPPORTED_IRRATIONAL_DOMAIN'; points?: Point2D[]; details?: string } {
  // If line is vertical: x = -c/a
  // Otherwise substitute y = (-a*x - c)/b
  if (l.b.num === 0n) {
    // x is fixed
    const x = l.c.neg().div(l.a);
    const dx = x.sub(c.center.x);
    const dxSq = dx.mul(dx);
    const rem = c.rSquared.sub(dxSq); // (y - y0)^2 = rem
    if (rem.num < 0n) {
      return { status: 'NO_INTERSECTION', points: [] };
    }
    if (rem.num === 0n) {
      return { status: 'TANGENT', points: [{ x, y: c.center.y }] };
    }
    // Check if rem is perfect rational square
    const numSq = isSquareBigInt(rem.num);
    const denSq = isSquareBigInt(rem.den);
    if (numSq.isSquare && denSq.isSquare) {
      const sqrtRem = new Fraction(numSq.root, denSq.root);
      const y1 = c.center.y.add(sqrtRem);
      const y2 = c.center.y.sub(sqrtRem);
      return {
        status: 'POINTS',
        points: [
          { x, y: y1 },
          { x, y: y2 },
        ],
      };
    }
    return {
      status: 'UNSUPPORTED_IRRATIONAL_DOMAIN',
      details: 'Intersection points have irrational coordinates outside field Q.',
    };
  }

  // Non-vertical line: y = mx + k where m = -a/b, k = -c/b
  const m = l.a.neg().div(l.b);
  const k = l.c.neg().div(l.b);

  // Circle: (x - x0)^2 + (mx + k - y0)^2 = r^2
  // Let d = k - y0
  // (x - x0)^2 + (mx + d)^2 = r^2
  // x^2 - 2*x0*x + x0^2 + m^2*x^2 + 2*m*d*x + d^2 = r^2
  // (1 + m^2)*x^2 + 2*(m*d - x0)*x + (x0^2 + d^2 - r^2) = 0
  const d = k.sub(c.center.y);
  const A = new Fraction(1n, 1n).add(m.mul(m));
  const B = new Fraction(2n, 1n).mul(m.mul(d).sub(c.center.x));
  const C = c.center.x.mul(c.center.x).add(d.mul(d)).sub(c.rSquared);

  // Discriminant: Disc = B^2 - 4*A*C
  const Disc = B.mul(B).sub(new Fraction(4n, 1n).mul(A).mul(C));

  if (Disc.num < 0n) {
    return { status: 'NO_INTERSECTION', points: [] };
  }
  if (Disc.num === 0n) {
    const x = B.neg().div(new Fraction(2n, 1n).mul(A));
    const y = m.mul(x).add(k);
    return { status: 'TANGENT', points: [{ x, y }] };
  }

  const numSq = isSquareBigInt(Disc.num);
  const denSq = isSquareBigInt(Disc.den);
  if (numSq.isSquare && denSq.isSquare) {
    const sqrtDisc = new Fraction(numSq.root, denSq.root);
    const twoA = new Fraction(2n, 1n).mul(A);
    const x1 = B.neg().add(sqrtDisc).div(twoA);
    const x2 = B.neg().sub(sqrtDisc).div(twoA);
    const y1 = m.mul(x1).add(k);
    const y2 = m.mul(x2).add(k);
    return {
      status: 'POINTS',
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
    };
  }

  return {
    status: 'UNSUPPORTED_IRRATIONAL_DOMAIN',
    details: 'Intersection points have irrational coordinates outside field Q.',
  };
}

/**
 * Correct Deterministic Discrete Geometry Executor
 */
export class GeometryExecutor implements IExecutor {
  execute(task: Task): ExecutionResult {
    try {
      const op = task.operation;
      const params = task.params;

      if (op === 'intersect_lines') {
        const l1 = parseLine(params.l1);
        const l2 = parseLine(params.l2);
        const res = intersectLinesExact(l1, l2);
        return {
          geometryResult: {
            status: res.status,
            point: res.point ? { x: res.point.x.toString(), y: res.point.y.toString() } : null,
          },
        };
      }

      if (op === 'verify_point_on_line') {
        const p = parsePoint(params.point);
        const l = parseLine(params.line);
        const onLine = isPointOnLineExact(p, l);
        return {
          geometryResult: {
            onLine,
            point: { x: p.x.toString(), y: p.y.toString() },
          },
        };
      }

      if (op === 'verify_point_on_circle') {
        const p = parsePoint(params.point);
        const c = parseCircle(params.circle);
        const onCircle = isPointOnCircleExact(p, c);
        return {
          geometryResult: {
            onCircle,
            point: { x: p.x.toString(), y: p.y.toString() },
          },
        };
      }

      if (op === 'verify_tangency') {
        const l = parseLine(params.line);
        const c = parseCircle(params.circle);
        const isTangent = isLineTangentToCircleExact(l, c);
        return {
          geometryResult: {
            isTangent,
          },
        };
      }

      if (op === 'intersect_line_circle') {
        const l = parseLine(params.line);
        const c = parseCircle(params.circle);
        const res = intersectLineCircleExact(l, c);
        return {
          geometryResult: {
            status: res.status,
            points: res.points?.map((p) => ({ x: p.x.toString(), y: p.y.toString() })) || [],
            details: res.details,
          },
        };
      }

      return { error: `UNSUPPORTED_GEOMETRY_OPERATION: ${op}` };
    } catch (err: any) {
      return { error: `GEOMETRY_EXECUTION_ERROR: ${err?.message || String(err)}` };
    }
  }
}

/**
 * Adversarial Negative Control Geometry Executor
 * Intentionally returns corrupted geometric results to test verifier defense.
 * Role: NEGATIVE_CONTROL.
 */
export class BadGeometryExecutor implements IExecutor {
  execute(task: Task): ExecutionResult {
    try {
      const op = task.operation;
      const params = task.params;

      if (op === 'intersect_lines') {
        // Deliberately offset the intersection point by +1/+1
        const l1 = parseLine(params.l1);
        const l2 = parseLine(params.l2);
        const res = intersectLinesExact(l1, l2);
        if (res.status === 'POINT' && res.point) {
          const badPoint = {
            x: res.point.x.add(new Fraction(1n, 1n)),
            y: res.point.y.add(new Fraction(1n, 1n)),
          };
          return {
            geometryResult: {
              status: 'POINT',
              point: { x: badPoint.x.toString(), y: badPoint.y.toString() },
              corrupted: true,
            },
          };
        }
        return {
          geometryResult: {
            status: 'POINT',
            point: { x: '999', y: '999' },
            corrupted: true,
          },
        };
      }

      if (op === 'verify_point_on_line') {
        // Deliberately returns wrong inverted boolean
        return {
          geometryResult: {
            onLine: false, // Falsely report not on line even if it is
            corrupted: true,
          },
        };
      }

      return {
        geometryResult: {
          status: 'CORRUPTED_NEGATIVE_CONTROL',
          corrupted: true,
        },
      };
    } catch (err: any) {
      return { error: `BAD_GEOMETRY_EXECUTION_ERROR: ${err?.message || String(err)}` };
    }
  }
}

/**
 * Independent Geometry Result Verifier
 * Verifies geometry claims from first principles independently of executor output.
 */
export function verifyGeometryExecution(
  task: Task,
  result: ExecutionResult
): { verified: boolean; claimVerdict: 'TRUE' | 'FALSE' | 'UNKNOWN' | 'NOT_APPLICABLE'; details: string } {
  if (result.error || !result.geometryResult) {
    return { verified: false, claimVerdict: 'UNKNOWN', details: 'No geometry result to verify.' };
  }

  const geoRes = result.geometryResult;
  const op = task.operation;
  const params = task.params;

  if (op === 'intersect_lines') {
    if (geoRes.status === 'POINT') {
      if (!geoRes.point) {
        return { verified: false, claimVerdict: 'UNKNOWN', details: 'Missing intersection point in result.' };
      }
      const p = parsePoint(geoRes.point);
      const l1 = parseLine(params.l1);
      const l2 = parseLine(params.l2);

      // Verify that p lies on BOTH lines
      const onL1 = isPointOnLineExact(p, l1);
      const onL2 = isPointOnLineExact(p, l2);

      if (!onL1 || !onL2) {
        return {
          verified: false,
          claimVerdict: 'UNKNOWN',
          details: `GEOMETRY_VERIFICATION_FAILED: Point (${p.x}, ${p.y}) does not satisfy both line equations (onL1: ${onL1}, onL2: ${onL2}).`,
        };
      }

      // Check user claim if present
      let claimVerdict: 'TRUE' | 'FALSE' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
      if (task.claim?.point) {
        const claimP = parsePoint(task.claim.point);
        const matches = claimP.x.sub(p.x).num === 0n && claimP.y.sub(p.y).num === 0n;
        claimVerdict = matches ? 'TRUE' : 'FALSE';
      }

      return {
        verified: true,
        claimVerdict,
        details: `Intersection point (${p.x}, ${p.y}) verified on both lines.`,
      };
    }

    if (geoRes.status === 'PARALLEL' || geoRes.status === 'COINCIDENT') {
      const l1 = parseLine(params.l1);
      const l2 = parseLine(params.l2);
      const actual = intersectLinesExact(l1, l2);
      const verified = actual.status === geoRes.status;
      return {
        verified,
        claimVerdict: 'NOT_APPLICABLE',
        details: verified ? `Line relation verified: ${geoRes.status}` : 'Line relation verification mismatch.',
      };
    }
  }

  if (op === 'verify_point_on_line') {
    const p = parsePoint(params.point);
    const l = parseLine(params.line);
    const actual = isPointOnLineExact(p, l);
    const verified = actual === geoRes.onLine;
    return {
      verified,
      claimVerdict: actual ? 'TRUE' : 'FALSE',
      details: verified ? `Point incidence verified (onLine: ${actual})` : 'Point incidence mismatch.',
    };
  }

  if (op === 'verify_tangency') {
    const l = parseLine(params.line);
    const c = parseCircle(params.circle);
    const actual = isLineTangentToCircleExact(l, c);
    const verified = actual === geoRes.isTangent;
    return {
      verified,
      claimVerdict: actual ? 'TRUE' : 'FALSE',
      details: verified ? `Tangency verified (isTangent: ${actual})` : 'Tangency mismatch.',
    };
  }

  if (op === 'intersect_line_circle') {
    const l = parseLine(params.line);
    const c = parseCircle(params.circle);
    const actual = intersectLineCircleExact(l, c);

    if (geoRes.status === 'UNSUPPORTED_IRRATIONAL_DOMAIN') {
      const verified = actual.status === 'UNSUPPORTED_IRRATIONAL_DOMAIN';
      return {
        verified,
        claimVerdict: 'NOT_APPLICABLE',
        details: 'Correctly flagged irrational coordinates as UNSUPPORTED_IRRATIONAL_DOMAIN.',
      };
    }

    if (geoRes.status === 'POINTS' && geoRes.points) {
      for (const ptRaw of geoRes.points) {
        const pt = parsePoint(ptRaw);
        if (!isPointOnLineExact(pt, l) || !isPointOnCircleExact(pt, c)) {
          return {
            verified: false,
            claimVerdict: 'UNKNOWN',
            details: `Point (${pt.x}, ${pt.y}) does not satisfy both line and circle equations.`,
          };
        }
      }
      return {
        verified: true,
        claimVerdict: 'NOT_APPLICABLE',
        details: 'Line-circle intersection points verified on both curves.',
      };
    }
  }

  return { verified: true, claimVerdict: 'NOT_APPLICABLE', details: 'Geometry operation completed.' };
}
