// TypeScript port of GymbileBackend.WellnessPlans.Personalization.RuleEvaluator
// (gymbile_backend/lib/.../rule_evaluator.ex). Pure evaluator: takes a list of
// rules and a ClientContext, returns one entry per rule with `condition_met`,
// normalised actions, the original condition, and any fail-closed diagnostics.
//
// Behavioural invariants ported from the Elixir version:
//   - `nil`/`undefined` field values short-circuit comparisons to `false`
//     (rules never match on missing data — safer than matching defaults).
//   - String/atom normalisation for eq/neq so an atom-like value compares
//     equal to its string form.
//   - `contains` / `not_contains` handle both list and string `actual` values.
//   - Action keys at the top level are normalised to strings.
//   - `condition` of `null` / `undefined` means "always fires" (returns true).
//   - Non-firing rules are still returned in the output (the UI surfaces
//     "rules considered" so trainers see what didn't apply and why).
//
// Fail-closed changes vs the wpl-eval source (deliberate, safety-critical):
//   1. A SimpleCondition.field not in KNOWN_FIELDS → UNKNOWN_CONDITION_FIELD
//      diagnostic (rule evaluates to not-met, caller can see safety rule was
//      silently disabled rather than getting a silent false).
//   2. An action whose `type` is missing/not a string → UNKNOWN_ACTION_TYPE
//      diagnostic instead of silently producing {type:"noop"}.

import type {
  ClientContext,
  Condition,
  SimpleCondition,
  CompoundCondition,
  RuleAction,
  EvaluatedRule,
  Rule,
  EnforcementDiagnostic,
} from './types.js';

// ---- fail-closed field registry -------------------------------------------
//
// KNOWN_FIELDS exactly mirrors the case labels in fieldValue() below.
// Any drift between this set and fieldValue() means either false-positive
// UNKNOWN_CONDITION_FIELD diagnostics (field in set but not in switch) or
// missed diagnostics (field in switch but not in set).

const KNOWN_FIELDS = new Set([
  'weight', 'weight_kg', 'height', 'height_cm', 'age', 'sex', 'gender',
  'experience', 'fitness_level', 'injuries', 'contraindications',
  'equipment', 'fatigue', 'goals', 'cycle_day', 'cycle_present',
]);

function collectUnknownFields(
  condition: Condition | null | undefined,
  ruleId: string,
  out: EnforcementDiagnostic[],
): void {
  if (!condition || typeof condition !== 'object') return;
  if (isCompound(condition)) {
    for (const sub of (condition as CompoundCondition).conditions ?? []) {
      collectUnknownFields(sub, ruleId, out);
    }
    return;
  }
  const field = (condition as SimpleCondition).field;
  if (typeof field === 'string' && !KNOWN_FIELDS.has(field)) {
    out.push({
      code: 'UNKNOWN_CONDITION_FIELD',
      rule_id: ruleId,
      message: `condition references field '${field}' which the enforcement engine cannot resolve — this rule can never fire`,
      meta: { field },
    });
  }
}

// ---- public API ------------------------------------------------------------

export function evaluateRules(
  rules: Rule[] | null | undefined,
  ctx: ClientContext,
): { evaluated: EvaluatedRule[]; diagnostics: EnforcementDiagnostic[] } {
  const diagnostics: EnforcementDiagnostic[] = [];
  const list = Array.isArray(rules) ? rules : [];

  const evaluated = list.map((rule, idx) => {
    const ruleId = rule.id ?? `rule_${idx + 1}`;
    const condition = rule.condition ?? null;
    collectUnknownFields(condition, ruleId, diagnostics);
    const met = conditionMet(condition, ctx);
    const actionsRaw = Array.isArray(rule.actions) ? rule.actions : [];

    const actions: RuleAction[] = [];
    for (const a of actionsRaw) {
      if (a && typeof a === 'object' && !Array.isArray(a) && typeof (a as RuleAction).type === 'string') {
        actions.push(normalizeAction(a));
      } else {
        diagnostics.push({
          code: 'UNKNOWN_ACTION_TYPE',
          rule_id: ruleId,
          message: 'action has no string `type`; it cannot be applied and is ignored',
          meta: { action: a },
        });
      }
    }

    return { rule_id: ruleId, condition_met: met, actions, condition };
  });

  return { evaluated, diagnostics };
}

export function firingActions(evaluated: EvaluatedRule[]): RuleAction[] {
  return evaluated.flatMap((r) => (r.condition_met ? r.actions : []));
}

// ---- condition_met? -------------------------------------------------------

function conditionMet(condition: Condition | null | undefined, ctx: ClientContext): boolean {
  if (condition === null || condition === undefined) return true;
  if (typeof condition !== 'object') return false;

  if (isCompound(condition)) return compoundMatch(condition as CompoundCondition, ctx);
  if (isSimple(condition)) return simpleMatch(condition as SimpleCondition, ctx);
  return false;
}

function isCompound(c: Condition): c is CompoundCondition {
  const cc = c as CompoundCondition & { type?: string };
  return cc.type === 'compound' || cc.operator !== undefined || Array.isArray(cc.conditions);
}

function isSimple(c: Condition): c is SimpleCondition {
  return typeof (c as SimpleCondition).field === 'string';
}

function compoundMatch(c: CompoundCondition, ctx: ClientContext): boolean {
  const op = c.operator ?? 'and';
  const conds = Array.isArray(c.conditions) ? c.conditions : [];

  if (op === 'or') return conds.some((sub) => conditionMet(sub, ctx));
  return conds.every((sub) => conditionMet(sub, ctx));
}

function simpleMatch(c: SimpleCondition, ctx: ClientContext): boolean {
  const op = c.op ?? 'eq';
  const actual = fieldValue(c.field, ctx);
  return compare(actual, op, c.value);
}

// ---- compare --------------------------------------------------------------

function compare(actual: unknown, op: string, value: unknown): boolean {
  // `nil` short-circuits to `false` — safer than letting `nil < n` raise
  // or evaluating to a confusing default.
  if (actual === null || actual === undefined) return false;

  switch (op) {
    case 'eq':
      return stringify(actual) === stringify(value);
    case 'neq':
      return stringify(actual) !== stringify(value);

    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (typeof actual !== 'number' || typeof value !== 'number') return false;
      if (op === 'gt') return actual > value;
      if (op === 'gte') return actual >= value;
      if (op === 'lt') return actual < value;
      return actual <= value;
    }

    case 'contains': {
      if (Array.isArray(actual)) {
        return actual.map(stringify).includes(stringify(value));
      }
      if (typeof actual === 'string') {
        return actual.includes(stringify(value) ?? '');
      }
      return false;
    }

    case 'not_contains': {
      if (Array.isArray(actual)) {
        return !actual.map(stringify).includes(stringify(value));
      }
      if (typeof actual === 'string') {
        return !actual.includes(stringify(value) ?? '');
      }
      return false;
    }

    // `in` / `not_in` invert the contains-axis: the rule's `value` is a
    // list, and the rule matches iff `actual` is (or isn't) a member.
    // Used for membership predicates like `cycle_day in [1, 2, 3]`.
    case 'in': {
      if (!Array.isArray(value)) return false;
      return value.map(stringify).includes(stringify(actual));
    }

    case 'not_in': {
      if (!Array.isArray(value)) return false;
      return !value.map(stringify).includes(stringify(actual));
    }

    default:
      return false;
  }
}

// Normalise atoms/symbols to strings so eq/neq comparisons are stable
// regardless of whether the producer emitted `"high"` or `:high`.
function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return String(v);
}

// ---- field resolution -----------------------------------------------------
//
// IMPORTANT: every case label here MUST appear in KNOWN_FIELDS above, and
// every entry in KNOWN_FIELDS MUST correspond to a case label here. See the
// drift-confirmation note in the module header.

function fieldValue(field: string, ctx: ClientContext): unknown {
  switch (field) {
    case 'weight':
    case 'weight_kg':
      return ctx.weight_kg ?? null;
    case 'height':
    case 'height_cm':
      return ctx.height_cm ?? null;
    case 'age':
      return ctx.age ?? null;
    case 'sex':
    case 'gender':
      return ctx.sex ?? null;
    case 'experience':
    case 'fitness_level':
      return ctx.experience ?? null;
    case 'injuries':
    case 'contraindications':
      return ctx.injuries ?? null;
    case 'equipment':
      return ctx.equipment ?? null;
    case 'fatigue':
      return ctx.fatigue ?? null;
    case 'goals':
      return ctx.goals ?? null;
    case 'cycle_day':
      // Set transiently by the lane B runtime when evaluating a specific
      // day's forbids. Allows rules like `cycle_day in [1,2,3]` to gate
      // forbid_exercise actions to the flow window of the client's
      // menstrual cycle. Outside of per-day evaluation this is null
      // and any cycle_day-conditioned rule short-circuits to false.
      return ctx.cycle_day ?? null;
    case 'cycle_present':
      return ctx.cycle ? true : null;
    default:
      return null;
  }
}

// ---- action normalisation -------------------------------------------------
//
// Only called for actions already confirmed to have a string `type`.
// The silent {type:"noop"} fallback from the eval source is intentionally
// removed — unknown-type actions are diagnosed at the call site instead.

function normalizeAction(a: unknown): RuleAction {
  // a is guaranteed to be a non-array object with a string `type` at this point
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a as Record<string, unknown>)) out[String(k)] = v;
  return out as RuleAction;
}
