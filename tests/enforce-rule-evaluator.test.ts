import { describe, it, expect } from 'vitest';
import { evaluateRules, firingActions } from '../src/enforce/rule-evaluator.js';
import type { ClientContext } from '../src/enforce/types.js';

const ctx: ClientContext = { injuries: ['torn_meniscus'], age: 35 };

describe('evaluateRules', () => {
  it('fires a contains rule on injuries', () => {
    const { evaluated } = evaluateRules(
      [{ id: 'r1', condition: { field: 'injuries', op: 'contains', value: 'torn_meniscus' }, actions: [{ type: 'forbid_exercise', exercise: 'pistol_squat' }] }],
      ctx,
    );
    expect(evaluated[0]!.condition_met).toBe(true);
    expect(firingActions(evaluated)).toEqual([{ type: 'forbid_exercise', exercise: 'pistol_squat' }]);
  });

  it('null condition always fires', () => {
    const { evaluated } = evaluateRules([{ id: 'r1', condition: null, actions: [{ type: 'forbid_exercise', exercise: 'x' }] }], ctx);
    expect(evaluated[0]!.condition_met).toBe(true);
  });

  it('missing context field short-circuits to not-met (no crash)', () => {
    const { evaluated } = evaluateRules([{ id: 'r1', condition: { field: 'weight', op: 'lt', value: 60 }, actions: [] }], ctx);
    expect(evaluated[0]!.condition_met).toBe(false);
  });

  it('UNKNOWN_CONDITION_FIELD diagnostic when a rule references a field the engine cannot resolve', () => {
    const { evaluated, diagnostics } = evaluateRules(
      [{ id: 'r1', condition: { field: 'injures', op: 'contains', value: 'torn_meniscus' }, actions: [{ type: 'forbid_exercise', exercise: 'pistol_squat' }] }],
      ctx,
    );
    expect(evaluated[0]!.condition_met).toBe(false);
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_CONDITION_FIELD', rule_id: 'r1', meta: expect.objectContaining({ field: 'injures' }) }),
    );
  });

  it('UNKNOWN_ACTION_TYPE diagnostic instead of silent noop', () => {
    const { diagnostics } = evaluateRules([{ id: 'r1', condition: null, actions: [{ exercise: 'pistol_squat' } as never] }], ctx);
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ACTION_TYPE', rule_id: 'r1' }));
  });

  it('in/not_in membership ops', () => {
    const dayCtx: ClientContext = { ...ctx, cycle_day: 2 };
    const { evaluated } = evaluateRules([{ id: 'r1', condition: { field: 'cycle_day', op: 'in', value: [1, 2, 3] }, actions: [] }], dayCtx);
    expect(evaluated[0]!.condition_met).toBe(true);
  });

  it('nested compound conditions', () => {
    const { evaluated } = evaluateRules(
      [{
        id: 'r1',
        condition: { operator: 'and', conditions: [ { field: 'age', op: 'gte', value: 30 }, { operator: 'or', conditions: [{ field: 'injuries', op: 'contains', value: 'torn_meniscus' }, { field: 'experience', op: 'eq', value: 'beginner' }] } ] },
        actions: [],
      }],
      ctx,
    );
    expect(evaluated[0]!.condition_met).toBe(true);
  });
});
