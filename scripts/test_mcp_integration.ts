import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DPCOCore } from '../src/core/dpcoCore';
import { createDpcoMcpServer } from '../src/integrations/mcp/adapter';
import { prepareAcceptanceTestAdmission } from './testSupport';

const projectRoot = resolve(process.cwd());
const expectedTools = [
  'dpco_execute_task',
  'dpco_get_result',
  'dpco_list_capabilities',
  'dpco_validate_task',
];

function getStructured<T>(result: unknown): T {
  assert.ok(result !== null && typeof result === 'object' && 'structuredContent' in result);
  const structuredContent = result.structuredContent;
  assert.ok(structuredContent !== null && typeof structuredContent === 'object');
  return structuredContent as T;
}

async function connectServer(server: ReturnType<typeof createDpcoMcpServer>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'dpco-mcp-integration-test', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

async function testStdioStartupAndTools(): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'src/integrations/mcp/server.ts'],
    cwd: projectRoot,
    stderr: 'inherit',
  });
  const client = new Client({ name: 'dpco-mcp-stdio-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), expectedTools);
    for (const tool of tools) {
      assert.ok(tool.inputSchema, `${tool.name} must publish an input schema`);
      assert.ok(tool.outputSchema, `${tool.name} must publish an output schema`);
    }

    const listed = getStructured<{
      capabilities: Array<{
        operation: string;
        coreOperation: string;
        registeredExecutors: string[];
      }>;
    }>(
      await client.callTool({ name: 'dpco_list_capabilities', arguments: {} })
    );
    const multivar = listed.capabilities.find((capability) => capability.operation === 'solve_system_multivar');
    assert.equal(multivar?.coreOperation, 'solve_system');
    assert.ok(multivar?.registeredExecutors.includes('multivar_linear_solver'));

    const validTask = {
      id: 'mcp-stdio-validate-001',
      operation: 'solve_linear',
      params: { a: '2', b: '0', c: '3' },
      constraints: { exact: true },
    };
    const valid = getStructured<{ valid: boolean; executionEligible: boolean; blockedReason: string | null }>(
      await client.callTool({
        name: 'dpco_validate_task',
        arguments: { task: validTask },
      })
    );
    assert.equal(valid.valid, true);
    assert.equal(valid.executionEligible, false);
    assert.notEqual(valid.blockedReason, null);

    const invalid = getStructured<{ valid: boolean; issues: string[] }>(
      await client.callTool({
        name: 'dpco_validate_task',
        arguments: {
          task: {
            id: 'mcp-invalid-001',
            operation: 'solve_linear',
            params: { a: 0, b: 0, c: 3 },
          },
        },
      })
    );
    assert.equal(invalid.valid, false);
    assert.match(invalid.issues.join(' '), /cannot be zero/);

    const invalidGeometry = getStructured<{ status: string; issues: string[] }>(
      await client.callTool({
        name: 'dpco_execute_task',
        arguments: {
          task: {
            id: 'mcp-invalid-geometry-001',
            operation: 'verify_point_on_line',
            params: {
              point: { x: '1', y: '2' },
              line: { a: '0', b: '0', c: '1' },
            },
          },
        },
      })
    );
    assert.equal(invalidGeometry.status, 'REJECTED');
    assert.match(invalidGeometry.issues.join(' '), /invalid|zero|line/i);

    const unknownOperation = getStructured<{ valid: boolean; issues: string[] }>(
      await client.callTool({
        name: 'dpco_validate_task',
        arguments: {
          task: {
            id: 'mcp-unknown-operation-001',
            operation: 'invented_operation',
            params: {},
          },
        },
      })
    );
    assert.equal(unknownOperation.valid, false);
    assert.match(unknownOperation.issues.join(' '), /Unsupported operation/);

    const invalidExecution = getStructured<{ status: string; executionStatus: string | null; issues: string[] }>(
      await client.callTool({
        name: 'dpco_execute_task',
        arguments: {
          task: {
            id: 'mcp-invalid-execute-001',
            operation: 'solve_linear',
            params: { a: 0, b: 0, c: 3 },
          },
        },
      })
    );
    assert.equal(invalidExecution.status, 'REJECTED');
    assert.equal(invalidExecution.executionStatus, null);
    assert.match(invalidExecution.issues.join(' '), /cannot be zero/);

    const blocked = getStructured<{
      status: string;
      executionStatus: string;
      verificationStatus: string;
      reason: string;
    }>(await client.callTool({
      name: 'dpco_execute_task',
      arguments: { task: validTask },
    }));
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.executionStatus, 'BLOCKED');
    assert.equal(blocked.verificationStatus, 'UNVERIFIED');
    assert.equal(blocked.reason, 'CAPABILITY_GAP');

    const found = getStructured<{ found: boolean; record: Record<string, unknown> | null }>(
      await client.callTool({
        name: 'dpco_get_result',
        arguments: { taskId: validTask.id },
      })
    );
    assert.equal(found.found, true);
    assert.equal(found.record?.final_executionStatus, 'BLOCKED');

    const diagnosticInjection = getStructured<{ status: string; issues: string[] }>(await client.callTool({
      name: 'dpco_execute_task',
      arguments: {
        task: {
          ...validTask,
          execution_mode: 'DIAGNOSTIC_TEST',
        },
      },
    }));
    assert.equal(diagnosticInjection.status, 'REJECTED');
    assert.match(diagnosticInjection.issues.join(' '), /Unsupported task fields: execution_mode/);
  } finally {
    await client.close();
  }
}

async function testAdmittedExecutionThroughMcpTools(): Promise<void> {
  const core = new DPCOCore();
  core.enableSystemSolver();
  core.enableMultiVarSolver();
  prepareAcceptanceTestAdmission(core);

  const { client } = await connectServer(createDpcoMcpServer(core));
  try {
    const output = getStructured<{
      status: string;
      executionStatus: string;
      verificationStatus: string;
      executor: string | null;
      grantId: string | null;
      evidenceIds: string[];
      result: { root: string | null } | null;
      steps: Array<{ step: string; passed: boolean }>;
    }>(await client.callTool({
      name: 'dpco_execute_task',
      arguments: {
        task: {
          id: 'mcp-admitted-execution-001',
          operation: 'solve_linear',
          params: { a: '2', b: '0', c: '3' },
          constraints: { exact: true },
        },
      },
    }));

    assert.equal(output.status, 'SUCCESS');
    assert.equal(output.executionStatus, 'SUCCESS');
    assert.equal(output.verificationStatus, 'VERIFIED');
    assert.equal(output.executor, 'exact_solver');
    assert.equal(output.result?.root, '3/2');
    assert.ok(output.grantId);
    assert.ok(output.evidenceIds.length > 0);
    assert.ok(output.steps.some((step) => step.step === 'independent_verification' && step.passed));

    const result = getStructured<{ found: boolean; record: Record<string, unknown> | null }>(
      await client.callTool({
        name: 'dpco_get_result',
        arguments: { taskId: 'mcp-admitted-execution-001' },
      })
    );
    assert.equal(result.found, true);
    assert.equal(result.record?.final_verificationStatus, 'VERIFIED');
  } finally {
    await client.close();
  }
}

async function testAliasAndNoPrivilegeEscalation(): Promise<void> {
  const core = new DPCOCore();
  core.enableMultiVarSolver();
  const { client } = await connectServer(createDpcoMcpServer(core));

  try {
    const checked = getStructured<{ valid: boolean; operation: string | null; coreOperation: string | null }>(
      await client.callTool({
        name: 'dpco_validate_task',
        arguments: {
          task: {
            id: 'mcp-alias-001',
            operation: 'solve_system_multivar',
            params: { matrix: [['2', '3'], ['1', '-1']], rhs: ['8', '1'] },
          },
        },
      })
    );
    assert.equal(checked.valid, true);
    assert.equal(checked.operation, 'solve_system_multivar');
    assert.equal(checked.coreOperation, 'solve_system');

    const attemptedOverride = getStructured<{ status: string; issues: string[] }>(await client.callTool({
      name: 'dpco_execute_task',
      arguments: {
        task: {
          id: 'mcp-override-001',
          operation: 'solve_linear',
          params: { a: '2', b: '0', c: '3' },
          forceExecutor: 'exact_solver',
        },
      },
    }));
    assert.equal(attemptedOverride.status, 'REJECTED');
    assert.match(attemptedOverride.issues.join(' '), /Unsupported task fields: forceExecutor/);

    const ordinary = getStructured<{ status: string; executionStatus: string; verificationStatus: string }>(
      await client.callTool({
        name: 'dpco_execute_task',
        arguments: {
          task: {
            id: 'mcp-no-admission-001',
            operation: 'solve_linear',
            params: { a: '2', b: '0', c: '3' },
          },
        },
      })
    );
    assert.equal(ordinary.status, 'BLOCKED');
    assert.equal(ordinary.executionStatus, 'BLOCKED');
    assert.equal(ordinary.verificationStatus, 'UNVERIFIED');
  } finally {
    await client.close();
  }
}

await testStdioStartupAndTools();
await testAdmittedExecutionThroughMcpTools();
await testAliasAndNoPrivilegeEscalation();
console.log('MCP integration tests passed: stdio startup, tool discovery, valid/invalid task handling, admission block, admitted verified execution, result lookup, alias mapping, and privilege-injection rejection.');
