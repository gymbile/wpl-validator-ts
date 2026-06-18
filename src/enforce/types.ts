// Client + rule types for the Pass-3 enforcement engine. Mirrors the Elixir
// GymbileBackend.WellnessPlans.Personalization.RuleEvaluator field set and the
// schema's $defs.Condition / $defs.Action vocabulary (schema 1.7.0).

export interface Cycle {
  /** ISO-8601 date of cycle day 1 of the most recent period. */
  last_period_start?: string;
  /** Average cycle length in days (required for pattern: "regular"). */
  length_days?: number;
  /** Days at cycle start treated as the flow window. 0/absent = none. */
  flow_days?: number;
  pattern?: 'regular' | 'irregular' | 'suppressed';
  /** Client-reported symptomatic date ranges (projection-independent). */
  flare_windows?: Array<{ start: string; end: string }>;
}

export interface ClientContext {
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  sex?: string | null;
  experience?: string | null;
  injuries?: string[] | null;
  equipment?: string[] | null;
  fatigue?: string | null;
  goals?: string[] | null;
  cycle?: Cycle | null;
  /** Set transiently by enforce() per plan-day; null outside per-day evaluation. */
  cycle_day?: number | null;
}

export type SimpleCondition = {
  field: string;
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value?: unknown;
};

export type CompoundCondition = {
  operator?: 'and' | 'or';
  conditions?: Condition[];
};

export type Condition = CompoundCondition | SimpleCondition;

export interface RuleAction {
  type: string;
  [k: string]: unknown;
}

export interface Rule {
  id?: string;
  condition?: Condition | null;
  actions?: RuleAction[];
}

export interface EvaluatedRule {
  rule_id: string;
  condition_met: boolean;
  actions: RuleAction[];
  condition: Condition | null;
}

/** Fail-closed diagnostics: anything the evaluator could not interpret. */
export interface EnforcementDiagnostic {
  code:
    | 'UNKNOWN_CONDITION_FIELD'   // rule references a field not in ClientContext
    | 'UNKNOWN_ACTION_TYPE'       // action type the engine cannot apply
    | 'MALFORMED_RULE';           // rule shape unusable
  rule_id: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface StrippedActivity {
  exercise: string;       // the ref/name that was removed
  matched_rule: string;   // rule_id that forbade it
  path: string;           // JSON pointer to the removed activity
}

export interface EnforcementResult {
  /** Deep-cloned plan with forbidden activities removed. */
  plan: Record<string, unknown>;
  evaluated_rules: EvaluatedRule[];
  stripped: StrippedActivity[];
  diagnostics: EnforcementDiagnostic[];
}

export interface EnforceOptions {
  /** ISO date of plan day 1 — required for cycle_day-conditioned rules. */
  planStartDate?: string;
  /**
   * Extra per-day forbids, projection-independent (e.g. client-reported
   * flare windows). Receives the ISO date of the plan day.
   */
  perDayExtraForbids?: (isoDate: string) => ReadonlySet<string>;
}
