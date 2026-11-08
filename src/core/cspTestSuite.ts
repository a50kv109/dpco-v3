/**
 * CSP-0.2 Passport Validation Test Suite
 * Evaluates the 10 mandatory integration test cases specified in DPCO Integration Phase 1.
 */

import { CspDocument, validateCspPassport } from './cspPassport';
import { DPCOCore } from './dpcoCore';
import { CapabilityRegistry } from './registry';

export interface CspTestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export function runCspTestSuite(core?: DPCOCore): {
  results: CspTestCaseResult[];
  passCount: number;
  failCount: number;
  totalDurationMs: number;
} {
  const startTime = performance.now();
  const results: CspTestCaseResult[] = [];
  const testCore = core || new DPCOCore();
  const reg = testCore.registry;

  // Baseline Valid Passport
  const validDoc: CspDocument = {
    passport: {
      core: 'OP.TR.DATA',
      description: 'Standard deterministic mathematical solver',
      requirements: {
        reasoning_depth: 0.5,
        structure: 0.9,
        adaptability: 0.2,
      },
      meta: {
        author: 'Artsybashev Andrii',
        version: '0.2',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json'],
          capabilities: ['solve_linear'],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['json'],
        },
      ],
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  };

  // Test 1: Valid CSP Passport
  {
    const tStart = performance.now();
    const res = validateCspPassport(validDoc);
    const passed = res.valid === true && res.errors.length === 0 && res.parsedCore?.nature === 'OP';
    results.push({
      id: 'CSP-T01',
      name: 'Valid CSP-0.2 Passport Admitted',
      passed,
      expected: 'valid: true, errors: 0, parsed Nature: OP',
      actual: `valid: ${res.valid}, errors: ${res.errors.length}, Nature: ${res.parsedCore?.nature}`,
      details: 'Conforming passport matches Nature.Action.Domain specification.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 2: Missing mandatory field (missing passport.core)
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    delete invalidDoc.passport.core;
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes('core'));
    results.push({
      id: 'CSP-T02',
      name: 'Missing Mandatory Field (core)',
      passed,
      expected: 'valid: false, error mentioning missing core',
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Validator correctly blocked document missing passport.core.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 3: Invalid CORE format
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    invalidDoc.passport.core = 'OP.TR'; // only 2 segments
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes('CORE format'));
    results.push({
      id: 'CSP-T03',
      name: 'Invalid CORE Format Structure',
      passed,
      expected: 'valid: false, error mentioning CORE format',
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Validator caught non-triad CORE structure.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 4: Unknown Nature
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    invalidDoc.passport.core = 'XX.TR.DATA';
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes("Unknown Nature 'XX'"));
    results.push({
      id: 'CSP-T04',
      name: 'Unknown Nature Rejection',
      passed,
      expected: "valid: false, error 'Unknown Nature XX'",
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Only OP, PR, AG, MI permitted by CSP ontology.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 5: Unknown Action
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    invalidDoc.passport.core = 'OP.MAGIC.DATA';
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes("Unknown Action 'MAGIC'"));
    results.push({
      id: 'CSP-T05',
      name: 'Unknown Action Rejection',
      passed,
      expected: "valid: false, error 'Unknown Action MAGIC'",
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Only TR, AN, SY, CO permitted.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 6: Incompatible Input/Output formats
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    invalidDoc.compatibility.input[0].formats = []; // Empty formats array
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes('formats'));
    results.push({
      id: 'CSP-T06',
      name: 'Incompatible / Empty Format Channel',
      passed,
      expected: 'valid: false, error on empty format channel',
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Compatibility layer strictly requires at least one format per channel.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 7: Invalid Data Type / Out of bounds
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    invalidDoc.passport.requirements.reasoning_depth = 1.8; // > 1.0 out of bounds
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes('out of bounds'));
    results.push({
      id: 'CSP-T07',
      name: 'Requirement Bounds Violation (>1.0)',
      passed,
      expected: 'valid: false, error out of bounds',
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Cognitive requirement dimensions must strictly reside in [0.0, 1.0].',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 8: Unsupported Version
  {
    const tStart = performance.now();
    const invalidDoc = JSON.parse(JSON.stringify(validDoc));
    invalidDoc.passport.meta.version = '99.9-beta';
    const res = validateCspPassport(invalidDoc);
    const passed = res.valid === false && res.errors.some((e) => e.includes('Unsupported passport specification version'));
    results.push({
      id: 'CSP-T08',
      name: 'Unsupported Passport Version',
      passed,
      expected: 'valid: false, unsupported version error',
      actual: `valid: ${res.valid}, errors: ${res.errors.join('; ')}`,
      details: 'Only 0.1, 0.2, 1.0 currently admitted.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 9: Valid passport does NOT mean executor is qualified
  {
    const tStart = performance.now();
    const customExecId = 'unqualified_custom_agent';
    const regRes = reg.registerPassport(customExecId, validDoc);
    const tier = reg.getQualificationTier(customExecId);
    // CRITICAL: Must be DECLARED, NOT VERIFIED or VALIDATED!
    const passed = regRes.success === true && tier === 'DECLARED';
    results.push({
      id: 'CSP-T09',
      name: 'Passport Validity != Qualification (DECLARED Only)',
      passed,
      expected: 'tier: DECLARED (not VERIFIED/VALIDATED)',
      actual: `tier: ${tier}, registered: ${regRes.success}`,
      details: 'Structural passport validity preserves boundary: capabilities remain DECLARED until tested.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  // Test 10: CSP Validator error must NOT crash entire DPCO
  {
    const tStart = performance.now();
    let crashed = false;
    let dpcoOperatingNormally = false;

    try {
      // Pass pathological garbage to validator
      validateCspPassport(null);
      validateCspPassport(undefined);
      validateCspPassport('corrupted_string');
      validateCspPassport(42);
      validateCspPassport({ passport: { core: null } });

      // Verify DPCO Core is still 100% operational on standard tasks
      const taskResult = testCore.processTask({
        id: 'CRASH-TEST-TASK',
        operation: 'solve_linear',
        params: { a: 2, b: 0, c: 3 },
        constraints: { exact: true },
      });

      dpcoOperatingNormally =
        taskResult.log.final_executionStatus === 'SUCCESS' &&
        taskResult.log.final_verificationStatus === 'VERIFIED';
    } catch {
      crashed = true;
    }

    const passed = !crashed && dpcoOperatingNormally;
    results.push({
      id: 'CSP-T10',
      name: 'Graceful Error Boundary / Core Immunity',
      passed,
      expected: 'crashed: false, dpcoOperatingNormally: true',
      actual: `crashed: ${crashed}, dpcoOperatingNormally: ${dpcoOperatingNormally}`,
      details: 'Malformed passports fail gracefully without interrupting DPCO kernel execution.',
      durationMs: Math.round((performance.now() - tStart) * 100) / 100,
    });
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;
  const totalDurationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    results,
    passCount,
    failCount,
    totalDurationMs,
  };
}
