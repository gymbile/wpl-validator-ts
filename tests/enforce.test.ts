import { describe, it, expect } from 'vitest';
import { enforce } from '../src/enforce/index.js';
import type { ClientContext, Rule } from '../src/enforce/types.js';

function minimalPlan(activities: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    version: '1.7.0',
    plan: {
      phases: [{
        weeks: [{
          order: 1,
          days: [{ day_of_week: 1, blocks: [{ type: 'main', activities }] }],
        }],
      }],
    },
  };
}

const ctx: ClientContext = { injuries: ['torn_meniscus'] };
const forbidRule: Rule = {
  id: 'forbid_pistol',
  condition: { field: 'injuries', op: 'contains', value: 'torn_meniscus' },
  actions: [{ type: 'forbid_exercise', exercise: 'pistol_squat' }],
};

describe('enforce', () => {
  it('strips a forbidden exercise and records it', () => {
    const plan = minimalPlan([
      { type: 'exercise', exercise_ref: 'pistol_squat' },
      { type: 'exercise', exercise_ref: 'bench_press' },
    ]);
    const result = enforce(plan, ctx, [forbidRule]);
    const acts = (result.plan as any).plan.phases[0].weeks[0].days[0].blocks[0].activities;
    expect(acts).toHaveLength(1);
    expect(acts[0].exercise_ref).toBe('bench_press');
    expect(result.stripped).toEqual([
      expect.objectContaining({ exercise: 'pistol_squat', matched_rule: 'forbid_pistol' }),
    ]);
  });

  it('fuzzy-matches the stripped name like the benchmark scorer', () => {
    const plan = minimalPlan([{ type: 'exercise', name: 'Pistol Squats' }]);
    const result = enforce(plan, ctx, [forbidRule]);
    expect(result.stripped).toHaveLength(1);
  });

  it('does not strip when the condition is not met', () => {
    const plan = minimalPlan([{ type: 'exercise', exercise_ref: 'pistol_squat' }]);
    const result = enforce(plan, { injuries: [] }, [forbidRule]);
    expect(result.stripped).toHaveLength(0);
  });

  it('does not mutate the input plan', () => {
    const plan = minimalPlan([{ type: 'exercise', exercise_ref: 'pistol_squat' }]);
    const snapshot = JSON.stringify(plan);
    enforce(plan, ctx, [forbidRule]);
    expect(JSON.stringify(plan)).toBe(snapshot);
  });

  it('surfaces diagnostics for unenforceable rules', () => {
    const bad: Rule = { id: 'r_typo', condition: { field: 'injures', op: 'contains', value: 'x' }, actions: [{ type: 'forbid_exercise', exercise: 'squat' }] };
    const result = enforce(minimalPlan([]), ctx, [bad]);
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_CONDITION_FIELD')).toBe(true);
  });

  it('applies cycle_day-conditioned forbids only on matching dates', () => {
    const cycleCtx: ClientContext = {
      injuries: [],
      cycle: { last_period_start: '2026-01-05', length_days: 28, flow_days: 3, pattern: 'regular' },
    };
    const flowRule: Rule = {
      id: 'flow_forbid',
      condition: { field: 'cycle_day', op: 'in', value: [1, 2, 3] },
      // Note: 'heavy_deadlift' cannot be used here because the matcher strips
      // 'heavy' as a qualifier token (coreTokens returns []) and returns false.
      // Using 'romanian_deadlift' whose core tokens are ['romanian','deadlift'].
      actions: [{ type: 'forbid_exercise', exercise: 'romanian_deadlift' }],
    };
    const plan = minimalPlan([{ type: 'exercise', exercise_ref: 'romanian_deadlift' }]);
    // planStartDate 2026-01-05, day_of_week=1 (offset 0) → date 2026-01-05
    // delta = daysBetween('2026-01-05','2026-01-05') = 0 → cycle_day = 1 → IN [1,2,3] → STRIP
    const hit = enforce(plan, cycleCtx, [flowRule], { planStartDate: '2026-01-05' });
    expect(hit.stripped).toHaveLength(1);
    // planStartDate 2026-01-14, day_of_week=1 (offset 0) → date 2026-01-14
    // delta = daysBetween('2026-01-05','2026-01-14') = 9 → cycle_day = 10 → NOT in [1,2,3] → NO STRIP
    const miss = enforce(plan, cycleCtx, [flowRule], { planStartDate: '2026-01-14' });
    // miss: planStartDate 2026-01-14, day_of_week=1 (offset 0) → date 2026-01-14
    // delta = daysBetween('2026-01-05','2026-01-14') = 9 → mod = 9 → cycle_day = 10 → NOT in [1,2,3] → no strip
    expect(miss.stripped).toHaveLength(0);
  });
});
