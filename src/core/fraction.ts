/**
 * Exact Rational Arithmetic (Fraction) implementation for DPCO.
 * High-precision rational arithmetic using BigInt to eliminate floating point drift.
 * Compatible with Python's fractions.Fraction.
 */

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

function expandScientificNotation(value: string): string | null {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/.exec(value);
  if (!match) return null;

  const [, sign, whole, fractional = '', exponentText] = match;
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10000) {
    throw new Error(`Invalid fraction string: ${value}`);
  }

  const digits = whole + fractional;
  const decimalPosition = whole.length + exponent;
  if (decimalPosition <= 0) {
    return `${sign}0.${'0'.repeat(-decimalPosition)}${digits}`;
  }
  if (decimalPosition >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalPosition - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}

export class Fraction {
  readonly num: bigint;
  readonly den: bigint;

  constructor(numerator: bigint | number | string | Fraction, denominator: bigint | number | string = 1n) {
    if (numerator instanceof Fraction) {
      if (denominator !== 1n) {
        const d = Fraction.from(denominator);
        const res = numerator.div(d);
        this.num = res.num;
        this.den = res.den;
      } else {
        this.num = numerator.num;
        this.den = numerator.den;
      }
      return;
    }

    if (typeof numerator === 'string') {
      const trimmed = numerator.trim();
      const expanded = expandScientificNotation(trimmed);
      if (expanded !== null) {
        const frac = new Fraction(expanded);
        this.num = frac.num;
        this.den = frac.den;
        return;
      } else if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length !== 2) throw new Error(`Invalid fraction string: ${numerator}`);
        const n = Fraction.from(parts[0].trim());
        const d = Fraction.from(parts[1].trim());
        const res = n.div(d);
        this.num = res.num;
        this.den = res.den;
        return;
      } else if (trimmed.includes('.')) {
        const parts = trimmed.split('.');
        const sign = trimmed.startsWith('-') ? -1n : 1n;
        const wholePart = BigInt(parts[0].replace('-', '') || '0');
        const decPart = parts[1] || '';
        const decLen = BigInt(decPart.length);
        const powerOfTen = 10n ** decLen;
        const totalNum = wholePart * powerOfTen + BigInt(decPart || '0');
        const n = sign * totalNum;
        const d = powerOfTen;
        const g = gcd(n, d);
        this.num = n / g;
        this.den = d / g;
        return;
      } else {
        const n = BigInt(trimmed);
        const d = typeof denominator === 'string' ? BigInt(denominator.trim()) : BigInt(denominator);
        if (d === 0n) throw new Error('ZeroDivisionError: denominator cannot be zero');
        const sign = d < 0n ? -1n : 1n;
        const absD = d < 0n ? -d : d;
        const actualN = n * sign;
        const g = gcd(actualN, absD);
        this.num = actualN / g;
        this.den = absD / g;
        return;
      }
    }

    if (typeof numerator === 'number') {
      if (!Number.isFinite(numerator)) throw new Error('Coefficient must be finite');
      if (Number.isInteger(numerator)) {
        let n = BigInt(numerator);
        let d = typeof denominator === 'number' ? BigInt(denominator) : typeof denominator === 'string' ? BigInt(denominator) : denominator;
        if (d === 0n) throw new Error('ZeroDivisionError: denominator cannot be zero');
        const sign = d < 0n ? -1n : 1n;
        const absD = d < 0n ? -d : d;
        const actualN = n * sign;
        const g = gcd(actualN, absD);
        this.num = actualN / g;
        this.den = absD / g;
        return;
      }
      // Floating point number: convert via decimal string
      const str = expandScientificNotation(numerator.toString()) ?? numerator.toString();
      const frac = new Fraction(str);
      this.num = frac.num;
      this.den = frac.den;
      return;
    }

    // numerator is bigint
    let n = numerator;
    let d = typeof denominator === 'bigint' ? denominator : BigInt(denominator);
    if (d === 0n) throw new Error('ZeroDivisionError: denominator cannot be zero');
    const sign = d < 0n ? -1n : 1n;
    const absD = d < 0n ? -d : d;
    const actualN = n * sign;
    const g = gcd(actualN, absD);
    this.num = actualN / g;
    this.den = absD / g;
  }

  static from(value: any): Fraction {
    if (value instanceof Fraction) return value;
    if (typeof value === 'boolean') throw new Error('boolean is not a numeric coefficient');
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error('Coefficient must be finite');
      return new Fraction(value);
    }
    if (typeof value === 'bigint') return new Fraction(value);
    if (typeof value === 'string') return new Fraction(value);
    throw new Error(`Cannot convert ${typeof value} to Fraction`);
  }

  add(other: Fraction | number | string | bigint): Fraction {
    const o = Fraction.from(other);
    const n = this.num * o.den + o.num * this.den;
    const d = this.den * o.den;
    return new Fraction(n, d);
  }

  sub(other: Fraction | number | string | bigint): Fraction {
    const o = Fraction.from(other);
    const n = this.num * o.den - o.num * this.den;
    const d = this.den * o.den;
    return new Fraction(n, d);
  }

  mul(other: Fraction | number | string | bigint): Fraction {
    const o = Fraction.from(other);
    const n = this.num * o.num;
    const d = this.den * o.den;
    return new Fraction(n, d);
  }

  neg(): Fraction {
    return new Fraction(-this.num, this.den);
  }

  div(other: Fraction | number | string | bigint): Fraction {
    const o = Fraction.from(other);
    if (o.num === 0n) throw new Error('ZeroDivisionError: division by zero');
    const n = this.num * o.den;
    const d = this.den * o.num;
    return new Fraction(n, d);
  }

  equals(other: Fraction | number | string | bigint): boolean {
    try {
      const o = Fraction.from(other);
      return this.num === o.num && this.den === o.den;
    } catch {
      return false;
    }
  }

  isZero(): boolean {
    return this.num === 0n;
  }

  toNumber(): number {
    return Number(this.num) / Number(this.den);
  }

  toString(): string {
    if (this.den === 1n) return this.num.toString();
    return `${this.num}/${this.den}`;
  }

  toDisplayString(): string {
    if (this.den === 1n) return this.num.toString();
    return `${this.num} / ${this.den}`;
  }
}
