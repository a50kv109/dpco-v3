import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BadExecutor, ExactExecutor, NumericalExecutor } from '../src/core/executors';
import { BadGeometryExecutor, GeometryExecutor } from '../src/core/geometry';
import { DPCOCore } from '../src/core/dpcoCore';
import { ExecutionResult, Task, VerifyStatus } from '../src/core/models';

function sourceRevision(root: string): string {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else files.push(path);
    }
  };

  visit(join(root, 'src'));
  visit(join(root, 'scripts'));
  visit(join(root, 'schemas'));
  files.push(
    join(root, 'package.json'),
    join(root, 'package-lock.json'),
    join(root, 'tsconfig.json'),
    join(root, 'vite.config.ts'),
    join(root, 'metadata.json'),
    join(root, 'index.html')
  );
  files.sort();

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative(root, file).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

export function prepareAcceptanceTestAdmission(core: DPCOCore): number {
  const revision = sourceRevision(process.cwd());
  const environment = `${process.platform}-${process.arch};${process.version}`;
  const task: Task = {
    id: 'admission-preflight-linear',
    operation: 'solve_linear',
    params: { a: 2, b: 0, c: 3 },
    constraints: { exact: true },
  };
  const geometryTask: Task = {
    id: 'admission-preflight-geometry',
    operation: 'intersect_lines',
    params: {
      l1: { a: 1, b: 1, c: -4 },
      l2: { a: 1, b: -1, c: 0 },
    },
  };

  const profiles: Array<{
    executorId: string;
    domain: string;
    role: 'PRODUCTION' | 'NEGATIVE_CONTROL';
    task: Task;
    executor: { execute(task: Task): ExecutionResult };
    expectedVerification: VerifyStatus;
  }> = [
    {
      executorId: 'exact_solver',
      domain: 'arithmetic.rational.linear',
      role: 'PRODUCTION',
      task,
      executor: new ExactExecutor(),
      expectedVerification: VerifyStatus.VERIFIED,
    },
    {
      executorId: 'num_solver',
      domain: 'arithmetic.linear',
      role: 'PRODUCTION',
      task: { ...task, constraints: undefined, params: { a: 3, b: 0, c: 1 } },
      executor: new NumericalExecutor(),
      expectedVerification: VerifyStatus.VERIFIED,
    },
    {
      executorId: 'test_bad_solver',
      domain: 'arithmetic.linear',
      role: 'NEGATIVE_CONTROL',
      task,
      executor: new BadExecutor(),
      expectedVerification: VerifyStatus.UNVERIFIED,
    },
    {
      executorId: 'geometry_solver',
      domain: 'geometry.2d.euclidean',
      role: 'PRODUCTION',
      task: geometryTask,
      executor: new GeometryExecutor(),
      expectedVerification: VerifyStatus.VERIFIED,
    },
    {
      executorId: 'bad_geometry_solver',
      domain: 'geometry.2d.euclidean',
      role: 'NEGATIVE_CONTROL',
      task: geometryTask,
      executor: new BadGeometryExecutor(),
      expectedVerification: VerifyStatus.UNVERIFIED,
    },
  ];

  for (const [index, profile] of profiles.entries()) {
    const result = profile.executor.execute(profile.task);
    if (result.error) {
      throw new Error(`Admission preflight failed for ${profile.executorId}: ${result.error}`);
    }
    const [verification] = core.verifier.verify(profile.task, result, profile.executorId);
    if (verification !== profile.expectedVerification) {
      throw new Error(
        `Admission preflight failed for ${profile.executorId}: expected ${profile.expectedVerification}, got ${verification}`
      );
    }

    const now = new Date().toISOString();
    const evidence = core.registry.evidenceRegistry.ingestTestResult({
      executor_id: profile.executorId,
      domain: profile.domain,
      test_profile_id: `dpco-v3-local-preflight-v1-${profile.executorId}`,
      source_revision: revision,
      environment,
      passed: true,
      total_checks: 1,
      failed_checks: 0,
      executed_at: now,
      harness_id: 'harness:dpco_test_harness',
      notes: `Direct executor output checked by IndependentVerifier (${verification}).`,
    });
    if (!evidence.accepted || !evidence.evidence_id) {
      throw new Error(`Admission evidence rejected for ${profile.executorId}: ${evidence.reason}`);
    }

    core.registry.issueAdmissionGrant({
      grant_id: `GRANT-LOCAL-PREFLIGHT-${index + 1}`,
      executor_id: profile.executorId,
      granted_role: profile.role,
      authorized_by: 'operator:local-test-harness',
      policy_id: 'POL-DPCO-V3-LOCAL-ACCEPTANCE-TEST',
      evidence_ids_verified: [evidence.evidence_id],
      issued_at: now,
    });
  }

  return profiles.length;
}
