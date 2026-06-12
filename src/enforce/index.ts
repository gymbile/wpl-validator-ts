// Pass-3 enforcement: evaluate personalization rules against a client
// context and strip forbidden activities from a compiled WPL plan.
//
// This is the runtime half of the WPL safety contract. Pass 1/2 (validate())
// check that a plan is well-formed; enforce() makes the plan safe *for this
// client*. Ported from the wpl-eval Lane B runtime (v0.6) so the shipped
// engine matches the published benchmark, with fail-closed diagnostics added.

import { evaluateRules, firingActions } from './rule-evaluator.js';
import { collides } from './matcher.js';
import { computeCycleDay, dayOfWeekOffset, dayDateForPlanPosition } from './cycle.js';
import type {
  ClientContext, Rule, RuleAction, EnforcementResult, EnforcementDiagnostic,
  EnforceOptions, StrippedActivity, EvaluatedRule,
} from './types.js';

const APPLICABLE_ACTIONS = new Set(['forbid_exercise']);

function forbiddenExercises(actions: RuleAction[]): Map<string, string> {
  // exercise → rule_id that forbade it (first wins, for attribution)
  const out = new Map<string, string>();
  for (const a of actions) {
    if (a.type === 'forbid_exercise' && typeof a['exercise'] === 'string') {
      const ex = a['exercise'] as string;
      if (!out.has(ex)) out.set(ex, (a['__rule_id'] as string) ?? 'unknown_rule');
    }
  }
  return out;
}

// Tag each firing action with its rule id so stripped entries are attributable.
function tagged(evaluated: EvaluatedRule[]): RuleAction[] {
  return evaluated.flatMap((r) =>
    r.condition_met ? r.actions.map((a) => ({ ...a, __rule_id: r.rule_id })) : [],
  );
}

function activityName(act: Record<string, unknown>): string {
  if (typeof act['exercise_ref'] === 'string') return act['exercise_ref'] as string;
  if (typeof act['name'] === 'string') return act['name'] as string;
  return '';
}

function matchForbid(name: string, forbids: ReadonlyMap<string, string>): string | null {
  if (!name) return null;
  for (const [pattern, ruleId] of forbids) {
    if (collides(name, pattern)) return ruleId;
  }
  return null;
}

export function enforce(
  planJson: Record<string, unknown>,
  ctx: ClientContext,
  rules: Rule[],
  options: EnforceOptions = {},
): EnforcementResult {
  const diagnostics: EnforcementDiagnostic[] = [];
  const stripped: StrippedActivity[] = [];

  const staticEval = evaluateRules(rules, ctx);
  diagnostics.push(...staticEval.diagnostics);
  const staticForbids = forbiddenExercises(tagged(staticEval.evaluated));

  for (const r of staticEval.evaluated) {
    for (const a of r.actions) {
      if (!APPLICABLE_ACTIONS.has(a.type)) {
        diagnostics.push({
          code: 'UNKNOWN_ACTION_TYPE',
          rule_id: r.rule_id,
          message: `action type '${a.type}' has no enforcement applicator yet — it is reported but not applied`,
          meta: { action_type: a.type },
        });
      }
    }
  }

  const clone = JSON.parse(JSON.stringify(planJson)) as Record<string, unknown>;
  const plan = clone['plan'];
  if (!plan || typeof plan !== 'object') {
    return { plan: clone, evaluated_rules: staticEval.evaluated, stripped, diagnostics };
  }

  const usesCycle = !!ctx.cycle && !!options.planStartDate;
  const phases = Array.isArray((plan as Record<string, unknown>)['phases'])
    ? ((plan as Record<string, unknown>)['phases'] as Record<string, unknown>[])
    : [];

  let weeksBeforePhase = 0;
  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi]!;
    const weeks = Array.isArray(phase['weeks']) ? (phase['weeks'] as Record<string, unknown>[]) : [];
    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi]!;
      const weekOrder = typeof week['order'] === 'number' ? (week['order'] as number) : wi + 1;
      const days = Array.isArray(week['days']) ? (week['days'] as Record<string, unknown>[]) : [];
      for (let di = 0; di < days.length; di++) {
        const day = days[di]!;

        let forbids: ReadonlyMap<string, string> = staticForbids;
        if (usesCycle || options.perDayExtraForbids) {
          const dowOffset = dayOfWeekOffset(day['day_of_week'] as string | number | undefined);
          if (dowOffset !== null && options.planStartDate) {
            const date = dayDateForPlanPosition(options.planStartDate, weeksBeforePhase, weekOrder, dowOffset);
            const dyn = new Map(staticForbids);
            if (usesCycle) {
              const cd = computeCycleDay(date, ctx.cycle!);
              const dayEval = evaluateRules(rules, { ...ctx, cycle_day: cd });
              for (const [ex, rid] of forbiddenExercises(tagged(dayEval.evaluated))) {
                if (!dyn.has(ex)) dyn.set(ex, rid);
              }
            }
            if (options.perDayExtraForbids) {
              for (const ex of options.perDayExtraForbids(date)) {
                if (!dyn.has(ex)) dyn.set(ex, 'per_day_extra');
              }
            }
            forbids = dyn;
          }
        }
        if (forbids.size === 0) continue;

        const blocks = Array.isArray(day['blocks']) ? (day['blocks'] as Record<string, unknown>[]) : [];
        for (let bi = 0; bi < blocks.length; bi++) {
          const block = blocks[bi]!;
          const activities = Array.isArray(block['activities'])
            ? (block['activities'] as Record<string, unknown>[])
            : [];
          const kept: Record<string, unknown>[] = [];
          for (let ai = 0; ai < activities.length; ai++) {
            const act = activities[ai]!;
            const name = activityName(act);
            const ruleId = matchForbid(name, forbids);
            if (ruleId === null) {
              kept.push(act);
            } else {
              stripped.push({
                exercise: name,
                matched_rule: ruleId,
                path: `/plan/phases/${pi}/weeks/${wi}/days/${di}/blocks/${bi}/activities/${ai}`,
              });
            }
          }
          block['activities'] = kept;
        }
      }
    }
    weeksBeforePhase += weeks.length;
  }

  return { plan: clone, evaluated_rules: staticEval.evaluated, stripped, diagnostics };
}

export { evaluateRules, firingActions } from './rule-evaluator.js';
export { collides } from './matcher.js';
export { computeCycleDay } from './cycle.js';
export type * from './types.js';
