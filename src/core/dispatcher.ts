import { Task } from './models';
import { CapabilityRegistry } from './registry';

export class DeterministicDispatcher {
  constructor(private registry: CapabilityRegistry) {}

  dispatch(task: Task): string | null {
    const candidates = this.registry.getCandidates(task);
    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const regA = this.registry.getExecutor(a);
      const regB = this.registry.getExecutor(b);
      const costA = regA?.props.cost ?? Number.POSITIVE_INFINITY;
      const costB = regB?.props.cost ?? Number.POSITIVE_INFINITY;

      if (costA !== costB) {
        return costA - costB;
      }
      return a.localeCompare(b);
    });

    return candidates[0];
  }
}
