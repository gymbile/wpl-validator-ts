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

/**
 * Machine-actionable repair guidance attached to a validation error.
 *
 * Designed for agentic completion loops: a higher-level orchestrator reads
 * `repair_hint` and constructs a targeted re-generation prompt (e.g. "add
 * weeks 2-12 to Phase 1 of this plan") without having to parse free-text
 * `message` strings.
 *
 * Every field except `action` and `target_path` is optional — rules emit
 * only the slots that apply to them.
 */
export interface RepairHint {
  /** What kind of repair the orchestrator should attempt. */
  action:
    | 'add_weeks'
    | 'add_days'
    | 'add_phases'
    | 'fix_activity'
    | 'fix_prescription'
    | 'resolve_ref'
    | 'remove_duplicate';
  /** JSON Pointer to the parent node the repair attaches to. */
  target_path: string;
  /** Human-readable label of the target (e.g. phase name, week label). */
  parent_name?: string;
  /** Identifiers of items the agent should generate (e.g. week numbers). */
  missing?: ReadonlyArray<string | number>;
  /** Declared total count where applicable (e.g. phase duration in weeks). */
  expected_count?: number;
  /** Currently-present count of items. */
  actual_count?: number;
  /** Set of values the agent must pick from (e.g. allowed activity types). */
  allowed_values?: ReadonlyArray<string>;
  /** Declared schema/DSL shape the agent should match. */
  expected_shape?: string;
  /** Multi-line DSL snippet illustrating the repair in place. */
  context_dsl_example?: string;
}

export interface ValidationError {
  path: string; // RFC 6901 JSON Pointer
  code: ErrorCode;
  message: string;
  severity: Severity;
  meta?: Record<string, unknown>;
  /** Optional structured guidance for agentic repair. */
  repair_hint?: RepairHint;
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
