/**
 * DPCO Core Models and Enums - Revision 4 Architecture Baseline
 * 
 * Domain Boundary: Arithmetic & Discrete 2D Geometry Only.
 * Enforces strict separation between Execution Status, Claim Verdict, and Verification Status.
 */

export enum ExecStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  BLOCKED = "BLOCKED",
}

export enum ClaimVerdict {
  TRUE = "TRUE",
  FALSE = "FALSE",
  UNKNOWN = "UNKNOWN",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export enum VerifyStatus {
  VERIFIED = "VERIFIED",
  UNVERIFIED = "UNVERIFIED",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

/**
 * Mathematical Rigor Levels for Task Execution
 * - TESTED: Requires active TEST_SUITE_PASSED evidence covering the domain.
 * - INSTANCE_VERIFIED: Requires independent runtime back-substitution of output.
 * - DOMAIN_VERIFIED: Requires proven algorithm correctness over domain (finite tests cannot satisfy this).
 */
export type MathematicalRigorLevel = 
  | 'TESTED'
  | 'INSTANCE_VERIFIED'
  | 'DOMAIN_VERIFIED';

export type TaskExecutionMode = 'PRODUCTION' | 'DIAGNOSTIC_TEST';

export interface Task {
  id: string;
  operation: string;
  params: Record<string, any>;
  claim?: Record<string, any> | null;
  constraints?: {
    exact?: boolean;
    required_rigor?: MathematicalRigorLevel;
    domain?: string;
    [key: string]: any;
  };
  execution_mode?: TaskExecutionMode;
}

export interface ExecutionResult {
  x?: string | number | null;
  systemSolution?: Record<string, string | number> | null;
  geometryResult?: any;
  error?: string | null;
  executed_at?: number;
}

export interface PipelineStep {
  step: 
    | 'validation' 
    | 'contradiction_gate' 
    | 'registry_dispatch' 
    | 'execution' 
    | 'independent_verification' 
    | 'classifier' 
    | 'ledger';
  name: string;
  passed: boolean;
  blocked?: boolean;
  details: string;
  timestamp: number;
  data?: Record<string, any>;
}

export interface LedgerRecord {
  task_id: string;
  operation: string;
  params: Record<string, any>;
  claim?: Record<string, any> | null;
  constraints?: Record<string, any>;
  reason: string | null;
  executor?: string;
  executor_root?: string | null;
  geometry_result?: any;
  exec_time_ms?: number;
  final_executionStatus: string;
  final_claimVerdict: string;
  final_verificationStatus: string;
  timestamp: number;
  
  // Revision 4 Epistemic & Provenance Fields
  grant_id?: string | null;
  effective_role?: string;
  evidence_ids_used?: string[];
  historical_admission_revoked?: boolean;
  revocation_event?: string;
  isolation_tier?: string;

  // Cryptographic audit chaining
  block_index?: number;
  prev_hash?: string;
  record_hash?: string;
}

export interface TaskProcessResult {
  log: LedgerRecord;
  steps: PipelineStep[];
}
