/**
 * CSP-0.2: Cognitive Skill Passport Specification and Validator
 * Standards Reference: https://github.com/a50kv109/CSP-0.1 (standards/CSP-0.2.md)
 * Author of standard: Artsybashev Andrii Oleksiiovych
 * License: CC BY 4.0
 * 
 * CORE = Nature . Action . Domain
 * Nature: OP (Operator), PR (Procedure), AG (Agent), MI (Mind Model)
 * Action: TR (Transformation), AN (Analysis), SY (Synthesis), CO (Coordination)
 * Domain: DATA (Structured), LANG (Text/Dialogue), SYS (Engineering/Systems), VIS (Spatial/Visual)
 * 
 * DPCO Extension:
 * Operational properties reside in extensions["dpco.execution/v1"]
 */

export const CSP_CORE_REGEX = /^(OP|PR|AG|MI)\.(TR|AN|SY|CO)\.(DATA|LANG|SYS|VIS)$/;

export const CSP_VALID_NATURES = ['OP', 'PR', 'AG', 'MI'] as const;
export const CSP_VALID_ACTIONS = ['TR', 'AN', 'SY', 'CO'] as const;
export const CSP_VALID_DOMAINS = ['DATA', 'LANG', 'SYS', 'VIS'] as const;

export type CspNature = typeof CSP_VALID_NATURES[number];
export type CspAction = typeof CSP_VALID_ACTIONS[number];
export type CspDomain = typeof CSP_VALID_DOMAINS[number];

export const SUPPORTED_CSP_VERSIONS = ['0.1', '0.2', '1.0'] as const;

export interface CspPassportRequirements {
  reasoning_depth: number; // 0.0 - 1.0
  structure: number;       // 0.0 - 1.0
  adaptability: number;    // 0.0 - 1.0
}

export interface CspPassportMeta {
  author?: string;
  version: string;
  origin?: string;
  license?: string;
  [key: string]: any;
}

export interface CspPassportBlock {
  core: string;
  description: string;
  requirements: CspPassportRequirements;
  meta: CspPassportMeta;
}

export interface CspCompatibilityChannel {
  category: string;
  formats: string[];
  capabilities?: string[];
}

export interface CspCompatibilityBlock {
  input?: CspCompatibilityChannel[];
  output?: CspCompatibilityChannel[];
  constraints?: {
    max_file_size_mb?: number;
    encoding?: string;
    exact_arithmetic?: boolean;
    cost_weight?: number;
    [key: string]: any;
  };
}

export interface CspRuntimeBlock {
  rating?: number;
  usage_count?: number;
  reliability?: {
    success_rate?: number | null;
    stability?: number | null;
  };
  tdi?: number;
  last_updated?: string;
}

export interface CspPolicyBlock {
  admission?: {
    status: 'accepted' | 'restricted' | 'rejected';
    reason?: {
      type: string;
      details?: string;
    };
  };
  lifecycle?: {
    state: 'active' | 'suspended' | 'deprecated' | 'removed';
  };
}

/**
 * DPCO Operational Execution Extension Schema (Revision 4)
 * Namespace: "dpco.execution/v1"
 */
export interface DpcoExecutionExtension {
  declared_role?: 'UNCLASSIFIED' | 'PRODUCTION' | 'NEGATIVE_CONTROL' | 'BENCHMARK_ORACLE';
  exact_arithmetic_declared?: boolean | 'UNKNOWN';
  declared_cost_weight?: number | null;
  determinism_guarantee_declared?: 'DETERMINISTIC' | 'STOCHASTIC' | 'UNKNOWN';
  isolation_tier_declared?: 'BUILTIN_TRUSTED' | 'WORKER_ISOLATED' | 'SUBPROCESS_SANDBOX';
  execution_constraints?: {
    timeout_ms?: number;
    max_memory_mb?: number | null;
  };
}

export interface CspDocument {
  passport: CspPassportBlock;
  compatibility?: CspCompatibilityBlock;
  runtime?: CspRuntimeBlock;
  policy?: CspPolicyBlock;
  extensions?: {
    'dpco.execution/v1'?: DpcoExecutionExtension;
    [key: string]: any;
  };
  verification?: {
    created_at?: string;
    verified_at?: string;
    verification_level?: string;
  };
}

export interface CspValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedCore?: {
    nature: CspNature;
    action: CspAction;
    domain: CspDomain;
    raw: string;
  };
  passportSummary?: {
    core: string;
    description: string;
    version: string;
    declaredOnly: boolean;
  };
}

/**
 * Validates a CSP-0.2 document according to standards/CSP-0.2.md and DPCO Revision 4
 * Never throws an unhandled exception: returns detailed errors list.
 */
export function validateCspPassport(rawInput: unknown): CspValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return {
      valid: false,
      errors: ['CSP_VALIDATION_ERROR: Root document must be a non-empty object.'],
      warnings: [],
    };
  }

  const doc = rawInput as Record<string, any>;

  // 1. Mandatory 'passport' block
  if (!doc.passport || typeof doc.passport !== 'object' || Array.isArray(doc.passport)) {
    errors.push("CSP_VALIDATION_ERROR: Missing mandatory top-level 'passport' block.");
    return { valid: false, errors, warnings };
  }

  const p = doc.passport;

  // 2. Mandatory passport.core
  if (!p.core || typeof p.core !== 'string') {
    errors.push("CSP_VALIDATION_ERROR: Missing or invalid mandatory field 'passport.core'.");
  } else {
    const parts = p.core.trim().split('.');
    if (parts.length !== 3) {
      errors.push(`CSP_VALIDATION_ERROR: Invalid CORE format '${p.core}'. Must follow 'Nature.Action.Domain'.`);
    } else {
      const [nature, action, domain] = parts;
      if (!CSP_VALID_NATURES.includes(nature as CspNature)) {
        errors.push(`CSP_VALIDATION_ERROR: Unknown Nature '${nature}'. Valid codes: ${CSP_VALID_NATURES.join(', ')}.`);
      }
      if (!CSP_VALID_ACTIONS.includes(action as CspAction)) {
        errors.push(`CSP_VALIDATION_ERROR: Unknown Action '${action}'. Valid codes: ${CSP_VALID_ACTIONS.join(', ')}.`);
      }
      if (!CSP_VALID_DOMAINS.includes(domain as CspDomain)) {
        errors.push(`CSP_VALIDATION_ERROR: Unknown Domain '${domain}'. Valid codes: ${CSP_VALID_DOMAINS.join(', ')}.`);
      }
    }
  }

  // 3. Mandatory passport.description
  if (!p.description || typeof p.description !== 'string' || p.description.trim().length === 0) {
    errors.push("CSP_VALIDATION_ERROR: Missing or empty 'passport.description'.");
  }

  // 4. Mandatory passport.requirements
  if (!p.requirements || typeof p.requirements !== 'object') {
    errors.push("CSP_VALIDATION_ERROR: Missing mandatory 'passport.requirements' block.");
  } else {
    const req = p.requirements;
    const reqKeys = ['reasoning_depth', 'structure', 'adaptability'] as const;
    for (const k of reqKeys) {
      if (typeof req[k] !== 'number') {
        errors.push(`CSP_VALIDATION_ERROR: Requirement '${k}' must be a number, received ${typeof req[k]}.`);
      } else if (req[k] < 0.0 || req[k] > 1.0) {
        errors.push(`CSP_VALIDATION_ERROR: Requirement '${k}' value ${req[k]} out of bounds [0.0, 1.0].`);
      }
    }
  }

  // 5. Mandatory passport.meta
  if (!p.meta || typeof p.meta !== 'object') {
    errors.push("CSP_VALIDATION_ERROR: Missing mandatory 'passport.meta' block.");
  } else {
    if (!p.meta.version || typeof p.meta.version !== 'string') {
      errors.push("CSP_VALIDATION_ERROR: Missing or non-string 'passport.meta.version'.");
    } else {
      const ver = p.meta.version.trim();
      const isSupported = SUPPORTED_CSP_VERSIONS.some((v) => ver === v || ver.startsWith(v));
      if (!isSupported) {
        errors.push(`CSP_VALIDATION_ERROR: Unsupported passport specification version '${ver}'. Supported: ${SUPPORTED_CSP_VERSIONS.join(', ')}.`);
      }
    }
  }

  // 6. Compatibility Layer validation (optional)
  if (doc.compatibility) {
    if (typeof doc.compatibility !== 'object' || Array.isArray(doc.compatibility)) {
      errors.push("CSP_VALIDATION_ERROR: 'compatibility' block must be an object.");
    } else {
      const comp = doc.compatibility;

      const validateChannels = (channels: any, channelName: 'input' | 'output') => {
        if (!channels) return;
        if (!Array.isArray(channels)) {
          errors.push(`CSP_VALIDATION_ERROR: 'compatibility.${channelName}' must be an array.`);
          return;
        }
        for (let i = 0; i < channels.length; i++) {
          const ch = channels[i];
          if (!ch || typeof ch !== 'object') {
            errors.push(`CSP_VALIDATION_ERROR: compatibility.${channelName}[${i}] must be an object.`);
            continue;
          }
          if (!ch.category || typeof ch.category !== 'string') {
            errors.push(`CSP_VALIDATION_ERROR: compatibility.${channelName}[${i}] missing valid 'category'.`);
          }
          if (!Array.isArray(ch.formats) || ch.formats.length === 0) {
            errors.push(`CSP_VALIDATION_ERROR: compatibility.${channelName}[${i}] must contain a non-empty 'formats' array.`);
          }
        }
      };

      validateChannels(comp.input, 'input');
      validateChannels(comp.output, 'output');
    }
  }

  // 7. Policy Layer (optional)
  if (doc.policy && typeof doc.policy === 'object') {
    if (doc.policy.admission?.status && !['accepted', 'restricted', 'rejected'].includes(doc.policy.admission.status)) {
      errors.push(`CSP_VALIDATION_ERROR: Invalid policy.admission.status '${doc.policy.admission.status}'.`);
    }
  }

  // 8. DPCO Execution Extension Validation (optional, but strictly validated if present)
  if (doc.extensions?.['dpco.execution/v1']) {
    const ext = doc.extensions['dpco.execution/v1'];
    if (typeof ext !== 'object' || Array.isArray(ext)) {
      errors.push("CSP_VALIDATION_ERROR: extensions['dpco.execution/v1'] must be an object.");
    } else {
      const validRoles = ['UNCLASSIFIED', 'PRODUCTION', 'NEGATIVE_CONTROL', 'BENCHMARK_ORACLE'];
      if (ext.declared_role && !validRoles.includes(ext.declared_role)) {
        errors.push(`CSP_VALIDATION_ERROR: Invalid declared_role '${ext.declared_role}'. Valid: ${validRoles.join(', ')}.`);
      }
      if (ext.execution_constraints?.timeout_ms !== undefined && (typeof ext.execution_constraints.timeout_ms !== 'number' || ext.execution_constraints.timeout_ms <= 0)) {
        errors.push("CSP_VALIDATION_ERROR: execution_constraints.timeout_ms must be a positive number.");
      }
    }
  }

  const valid = errors.length === 0;
  let parsedCore: CspValidationResult['parsedCore'];
  if (valid && typeof p.core === 'string') {
    const [nature, action, domain] = p.core.split('.');
    parsedCore = {
      nature: nature as CspNature,
      action: action as CspAction,
      domain: domain as CspDomain,
      raw: p.core,
    };
  }

  return {
    valid,
    errors,
    warnings,
    parsedCore,
    passportSummary: valid
      ? {
          core: p.core,
          description: p.description,
          version: p.meta?.version,
          declaredOnly: true,
        }
      : undefined,
  };
}

/**
 * Standard CSP-0.2 passports for DPCO internal arithmetic & geometry executors
 */
export const DPCO_CORE_PASSPORTS: Record<string, CspDocument> = {
  exact_solver: {
    passport: {
      core: 'OP.TR.DATA',
      description: 'Deterministic rational linear solver using BigInt Fraction calculus.',
      requirements: {
        reasoning_depth: 0.2,
        structure: 1.0,
        adaptability: 0.1,
      },
      meta: {
        author: 'DPCO Core Working Group',
        version: '0.2',
        origin: 'https://github.com/a50kv109/dpco',
        license: 'Apache-2.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json', 'object'],
          capabilities: ['solve_linear'],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['fraction_string'],
        },
      ],
      constraints: {
        exact_arithmetic: true,
        cost_weight: 10,
      },
    },
    extensions: {
      'dpco.execution/v1': {
        declared_role: 'PRODUCTION',
        exact_arithmetic_declared: true,
        declared_cost_weight: 10,
        determinism_guarantee_declared: 'DETERMINISTIC',
        isolation_tier_declared: 'BUILTIN_TRUSTED',
        execution_constraints: {
          timeout_ms: 2000,
          max_memory_mb: 64,
        },
      },
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  },

  num_solver: {
    passport: {
      core: 'OP.TR.DATA',
      description: 'Hardware floating point solver for scalar linear equations with tolerance comparison.',
      requirements: {
        reasoning_depth: 0.1,
        structure: 0.9,
        adaptability: 0.1,
      },
      meta: {
        author: 'DPCO Core Working Group',
        version: '0.2',
        origin: 'https://github.com/a50kv109/dpco',
        license: 'Apache-2.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json', 'object'],
          capabilities: ['solve_linear'],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['float64'],
        },
      ],
      constraints: {
        exact_arithmetic: false,
        cost_weight: 5,
      },
    },
    extensions: {
      'dpco.execution/v1': {
        declared_role: 'PRODUCTION',
        exact_arithmetic_declared: false,
        declared_cost_weight: 5,
        determinism_guarantee_declared: 'DETERMINISTIC',
        isolation_tier_declared: 'BUILTIN_TRUSTED',
        execution_constraints: {
          timeout_ms: 1000,
          max_memory_mb: 32,
        },
      },
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  },

  test_bad_solver: {
    passport: {
      core: 'OP.TR.DATA',
      description: 'Controlled adversarial executor returning corrupted roots to test verifier defense.',
      requirements: {
        reasoning_depth: 0.0,
        structure: 0.2,
        adaptability: 0.0,
      },
      meta: {
        author: 'DPCO Test Framework',
        version: '0.2',
        origin: 'https://github.com/a50kv109/dpco',
        license: 'Apache-2.0',
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
          formats: ['float64'],
        },
      ],
    },
    extensions: {
      'dpco.execution/v1': {
        declared_role: 'NEGATIVE_CONTROL',
        exact_arithmetic_declared: false,
        declared_cost_weight: 99,
        determinism_guarantee_declared: 'DETERMINISTIC',
        isolation_tier_declared: 'BUILTIN_TRUSTED',
        execution_constraints: {
          timeout_ms: 1000,
        },
      },
    },
    policy: {
      admission: {
        status: 'restricted',
        reason: { type: 'safety', details: 'Excluded from automatic dispatch; test harness only.' },
      },
      lifecycle: { state: 'active' },
    },
  },

  linear_system_solver: {
    passport: {
      core: 'OP.TR.DATA',
      description: 'Exact rational solver for consistent multi-equation linear systems (DPCO v0.2).',
      requirements: {
        reasoning_depth: 0.4,
        structure: 1.0,
        adaptability: 0.2,
      },
      meta: {
        author: 'DPCO Core Working Group',
        version: '0.2',
        origin: 'https://github.com/a50kv109/dpco',
        license: 'Apache-2.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json', 'object'],
          capabilities: ['solve_system'],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['fraction_string'],
        },
      ],
      constraints: {
        exact_arithmetic: true,
        cost_weight: 15,
      },
    },
    extensions: {
      'dpco.execution/v1': {
        declared_role: 'PRODUCTION',
        exact_arithmetic_declared: true,
        declared_cost_weight: 15,
        determinism_guarantee_declared: 'DETERMINISTIC',
        isolation_tier_declared: 'BUILTIN_TRUSTED',
      },
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  },

  // Geometry Subsystem Passports
  geometry_solver: {
    passport: {
      core: 'OP.AN.DATA',
      description: 'Deterministic 2D discrete Euclidean geometry engine using exact rational arithmetic.',
      requirements: {
        reasoning_depth: 0.4,
        structure: 1.0,
        adaptability: 0.2,
      },
      meta: {
        author: 'DPCO Geometry Subsystem',
        version: '0.2',
        origin: 'https://github.com/a50kv109/dpco',
        license: 'Apache-2.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json'],
          capabilities: [
            'intersect_lines',
            'verify_point_on_line',
            'verify_point_on_circle',
            'verify_tangency',
            'intersect_line_circle',
          ],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['geometry_result_json'],
        },
      ],
      constraints: {
        exact_arithmetic: true,
        cost_weight: 20,
      },
    },
    extensions: {
      'dpco.execution/v1': {
        declared_role: 'PRODUCTION',
        exact_arithmetic_declared: true,
        declared_cost_weight: 20,
        determinism_guarantee_declared: 'DETERMINISTIC',
        isolation_tier_declared: 'BUILTIN_TRUSTED',
      },
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  },

  bad_geometry_solver: {
    passport: {
      core: 'OP.AN.DATA',
      description: 'Adversarial negative-control geometry executor returning corrupt intersection points.',
      requirements: {
        reasoning_depth: 0.0,
        structure: 0.3,
        adaptability: 0.0,
      },
      meta: {
        author: 'DPCO Geometry Test Framework',
        version: '0.2',
        origin: 'https://github.com/a50kv109/dpco',
        license: 'Apache-2.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json'],
          capabilities: [
            'intersect_lines',
            'verify_point_on_line',
            'verify_point_on_circle',
            'verify_tangency',
            'intersect_line_circle',
          ],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['geometry_result_json'],
        },
      ],
    },
    extensions: {
      'dpco.execution/v1': {
        declared_role: 'NEGATIVE_CONTROL',
        exact_arithmetic_declared: false,
        declared_cost_weight: 999,
        determinism_guarantee_declared: 'DETERMINISTIC',
        isolation_tier_declared: 'BUILTIN_TRUSTED',
      },
    },
    policy: {
      admission: {
        status: 'restricted',
        reason: { type: 'safety', details: 'Negative control only.' },
      },
      lifecycle: { state: 'active' },
    },
  },
};
