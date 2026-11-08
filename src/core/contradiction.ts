import { Fraction } from './fraction';
import { Task } from './models';

export interface ContradictionPair {
  firstIndex: number;
  secondIndex: number;
  eqA: { a: any; b: any; c: any };
  eqB: { a: any; b: any; c: any };
  rootA: string;
  rootB: string;
}

export class ContradictionGate {
  check(task: Task): [boolean, string, ContradictionPair | null] {
    if (task.operation !== 'solve_system') {
      return [false, '', null];
    }

    const equations = task.params?.eqs;
    if (!Array.isArray(equations)) {
      return [false, '', null];
    }

    for (let first = 0; first < equations.length; first++) {
      const eqA = equations[first];
      let a1: Fraction;
      let d1: Fraction;
      try {
        a1 = Fraction.from(eqA.a);
        d1 = Fraction.from(eqA.c).sub(Fraction.from(eqA.b));
      } catch {
        continue;
      }

      for (let second = first + 1; second < equations.length; second++) {
        const eqB = equations[second];
        let a2: Fraction;
        let d2: Fraction;
        try {
          a2 = Fraction.from(eqB.a);
          d2 = Fraction.from(eqB.c).sub(Fraction.from(eqB.b));
        } catch {
          continue;
        }

        // a1 * d2 !== a2 * d1
        const left = a1.mul(d2);
        const right = a2.mul(d1);
        if (!left.equals(right)) {
          const rootA = d1.div(a1).toString();
          const rootB = d2.div(a2).toString();
          return [
            true,
            `CONTRADICTION: Eq ${first} and Eq ${second} are mutually exclusive. (Root A = ${rootA}, Root B = ${rootB})`,
            {
              firstIndex: first,
              secondIndex: second,
              eqA,
              eqB,
              rootA,
              rootB,
            },
          ];
        }
      }
    }

    return [false, '', null];
  }
}
