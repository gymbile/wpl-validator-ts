export type ErrorCode =
  | 'SCHEMA_VIOLATION'
  | 'DUPLICATE_ID'
  | 'UNRESOLVED_REF'
  | 'EMPTY_PHASES_FOR_TYPE'
  | 'MISSING_EXERCISE_REF'
  | 'INVALID_PRESCRIPTION'
  | 'INVALID_PERSONALIZATION_RULE'
  | 'INVALID_POINTS_RULE'
  | 'PHASE_DURATION_MISMATCH'
  | 'CYCLIC_SUBPLAN'
  | 'ACTIVITY_BLOCK_MISMATCH';

export type Severity = 'error' | 'warning';

export interface ValidationError {
  path: string; // RFC 6901 JSON Pointer
  code: ErrorCode;
  message: string;
  severity: Severity;
  meta?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface Catalog {
  exercises?: ReadonlySet<string>;
  meals?: ReadonlySet<string>;
  meditations?: ReadonlySet<string>;
}

export interface ValidationOptions {
  catalog?: Catalog;
}
