/**
 * DPCO Capability Manifest — Grok Edition Pass 3
 * Deterministic. Distinguishes implementation from runtime availability.
 * Separates legacy 1-var solve_system from multi-var matrix form.
 */
export type AvailabilityStatus =
  | 'IMPLEMENTED'
  | 'AVAILABLE'
  | 'IMPLEMENTED_BUT_DISABLED'
  | 'DESIGNED'
  | 'UNSUPPORTED';

export interface OperationCapability {
  id: string;
  category: 'arithmetic' | 'linear_algebra' | 'geometry_2d' | 'diagnostic';
  summary: string;
  numeric_domain: 'rational' | 'float64' | 'mixed';
  exact_by_default: boolean;
  implementation_status: AvailabilityStatus;
  /** Parameter profile this entry describes */
  param_profile: 'legacy_eqs' | 'matrix_rhs' | 'standard';
  activation?: string;
  verification: {
    method: string;
    independence: 'residual' | 'substitution' | 'recompute' | 'shared_predicate' | 'none';
    common_mode_risk?: string;
    proves?: string;
    does_not_prove?: string;
  };
  unsupported: string[];
  execution_modes: Array<'PRODUCTION' | 'DIAGNOSTIC_TEST'>;
  params_summary: string;
}

export const DPCO_CAPABILITY_MANIFEST = {
  manifest_version: '1.0.2',
  dpco_edition: 'Grok Independent Engineering Edition (Pass 3)',
  numeric_domains: ['rational', 'float64'] as const,
  operations: [
    {
      id: 'solve_linear',
      category: 'arithmetic',
      summary: 'Solve a*x + b = c over rationals or floats.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'standard',
      verification: { method: 'back-substitution residual', independence: 'substitution' },
      unsupported: ['non-linear', 'multi-variable'],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ a, b, c }',
    },
    {
      id: 'solve_system',
      category: 'linear_algebra',
      summary: 'Legacy single-variable systems: { eqs: [{a,b,c}, ...] }. Available when linear_system_solver is enabled.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'legacy_eqs',
      verification: { method: 'substitution / residual', independence: 'substitution' },
      unsupported: ['non-linear', 'multi-variable matrix form'],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ eqs: Array<{a,b,c}> }',
    },
    {
      id: 'solve_system_multivar',
      category: 'linear_algebra',
      summary:
        'Multi-variable linear systems over Q: { matrix, rhs }. Requires enableMultiVarSolver(). DECLARED only until qualified; no automatic evidence or PRODUCTION grant. Residual check proves SOLUTION_SATISFIES_SYSTEM, not uniqueness.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'IMPLEMENTED_BUT_DISABLED',
      param_profile: 'matrix_rhs',
      activation:
        'core.enableMultiVarSolver(). Effective role stays UNCLASSIFIED until explicit AdmissionGrant after trusted test ingestion via EvidenceRegistry.ingestTestResult().',
      verification: {
        method: 'residual A·x − b (exact)',
        independence: 'residual',
        common_mode_risk: 'Shares Fraction/BigInt with executor.',
        proves: 'SOLUTION_SATISFIES_SYSTEM (residuals zero)',
        does_not_prove: 'Uniqueness / full column rank',
      },
      unsupported: ['non-linear', 'infinite solution sets (UNDERDETERMINED)', 'zero-column matrix'],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ matrix: (number|string)[][], rhs: (number|string)[] }',
    },
    {
      id: 'intersect_lines',
      category: 'geometry_2d',
      summary: 'Exact line-line intersection. POINT | PARALLEL | COINCIDENT.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'standard',
      verification: { method: 'incidence residual', independence: 'residual' },
      unsupported: ['3D'],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ l1: {a,b,c}, l2: {a,b,c} }',
    },
    {
      id: 'verify_point_on_line',
      category: 'geometry_2d',
      summary: 'Exact point-on-line incidence.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'standard',
      verification: { method: 'exact residual', independence: 'residual' },
      unsupported: [],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ point: {x,y}, line: {a,b,c} }',
    },
    {
      id: 'verify_point_on_circle',
      category: 'geometry_2d',
      summary: 'Exact point-on-circle incidence.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'standard',
      verification: { method: 'exact residual', independence: 'residual' },
      unsupported: [],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ point, circle }',
    },
    {
      id: 'verify_tangency',
      category: 'geometry_2d',
      summary: 'Exact line-circle tangency.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'standard',
      verification: { method: 'discriminant residual', independence: 'residual' },
      unsupported: [],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ line, circle }',
    },
    {
      id: 'intersect_line_circle',
      category: 'geometry_2d',
      summary: 'Exact line-circle intersection or UNSUPPORTED_IRRATIONAL_DOMAIN.',
      numeric_domain: 'rational',
      exact_by_default: true,
      implementation_status: 'AVAILABLE',
      param_profile: 'standard',
      verification: { method: 'incidence residual', independence: 'residual' },
      unsupported: ['irrational coordinates'],
      execution_modes: ['PRODUCTION', 'DIAGNOSTIC_TEST'],
      params_summary: '{ line, circle }',
    },
  ] as OperationCapability[],
};

export function listSupportedOperations(): string[] {
  return DPCO_CAPABILITY_MANIFEST.operations.map((op) => op.id);
}

export function getOperationCapability(id: string): OperationCapability | undefined {
  return DPCO_CAPABILITY_MANIFEST.operations.find((op) => op.id === id);
}

/**
 * Runtime availability reflecting enablement state.
 * multiVarEnabled = true only after core.enableMultiVarSolver().
 * Still does NOT imply PRODUCTION admission.
 */
export function getRuntimeAvailability(
  opId: string,
  multiVarEnabled: boolean
): AvailabilityStatus {
  const op = getOperationCapability(opId);
  if (!op) return 'UNSUPPORTED';

  if (opId === 'solve_system_multivar') {
    // Code exists; enabled only after enableMultiVarSolver(); still needs grant for PRODUCTION
    return multiVarEnabled ? 'IMPLEMENTED' : 'IMPLEMENTED_BUT_DISABLED';
  }

  return op.implementation_status;
}
