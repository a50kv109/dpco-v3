import { DPCOCore } from '../src/core/dpcoCore';
import { MultiVarLinearExecutor } from '../src/core/executors';
import { verifyLinearSolutionByResidual } from '../src/core/multiVarVerify';

console.log('=== Grok Edition: Multi-Var Linear Solver Smoke Test ===\n');
const core = new DPCOCore();
core.enableMultiVarSolver();

const task1 = {
  id: 'mv-1',
  operation: 'solve_system',
  params: { matrix: [[1, 1], [1, -1]], rhs: [5, 1] },
  constraints: { exact: true },
};
const res1 = core.processTask(task1 as any);
console.log('Test 1 (2x2 unique):', res1.log.final_executionStatus, res1.log.final_verificationStatus);
console.log('  solution:', (res1.log as any).systemSolution);

const exec = new MultiVarLinearExecutor();
const direct = exec.execute(task1 as any);
console.log('  direct:', direct.systemSolution);
if (direct.systemSolution) {
  const v = verifyLinearSolutionByResidual(task1.params.matrix, task1.params.rhs, direct.systemSolution as any);
  console.log('  residual verified:', v.verified, '-', v.details);
}

const direct2 = exec.execute({ id:'mv-2', operation:'solve_system', params:{ matrix:[[1,1],[2,2]], rhs:[3,7] } } as any);
console.log('\nTest 2 (inconsistent):', direct2.error);

const direct3 = exec.execute({ id:'mv-3', operation:'solve_system', params:{ eqs:[{a:2,b:3,c:11},{a:4,b:6,c:22}] } } as any);
console.log('\nTest 3 (legacy 1-var):', direct3.systemSolution || direct3.x || direct3.error);
console.log('\n=== done ===');
