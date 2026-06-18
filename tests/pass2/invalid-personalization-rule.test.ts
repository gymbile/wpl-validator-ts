import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { invalidPersonalizationRule } from '../../src/pass2-semantic/rules/invalid-personalization-rule';

const wrap = (rule: any) => ({
  plan: {
    id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [], phases: [],
    personalization: { rules: [rule] },
  },
});

describe('rule: INVALID_PERSONALIZATION_RULE', () => {
  it('flags unknown action type', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { field: 'age', op: 'gt', value: 60 },
      actions: [{ type: 'set_world_on_fire', scope: 'plan' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'INVALID_PERSONALIZATION_RULE',
      path: '/plan/personalization/rules/0/actions/0',
      meta: { reason: 'invalid_action_type', field: 'type', value: 'set_world_on_fire' },
    });
  });

  it('flags invalid action scope', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { field: 'age', op: 'gt', value: 60 },
      actions: [{ type: 'reduce_reps', scope: 'galaxy' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors[0]?.meta).toMatchObject({ reason: 'invalid_action_scope', field: 'scope', value: 'galaxy' });
  });

  it('flags empty actions list', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { field: 'age', op: 'gt', value: 60 },
      actions: [],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors[0]?.meta?.reason).toBe('actions_must_be_non_empty_list');
  });

  it('flags malformed condition (no field, no operator)', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { value: 'whatever' },
      actions: [{ type: 'reduce_reps' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors[0]?.meta?.reason).toBe('invalid_condition');
  });

  it('does not flag a valid CompoundCondition', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { operator: 'and', conditions: [{ field: 'age', op: 'gt', value: 60 }] },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors).toEqual([]);
  });

  it('flags CompoundCondition with invalid operator', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { operator: 'xor', conditions: [{ field: 'age', op: 'gt', value: 60 }] },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors[0]?.meta?.reason).toBe('invalid_condition');
  });

  it('flags CompoundCondition with empty conditions array', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { operator: 'and', conditions: [] },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors[0]?.meta?.reason).toBe('invalid_condition');
  });

  it('flags nested CompoundCondition with invalid inner operator', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: {
        operator: 'and',
        conditions: [{ operator: 'xor', conditions: [{ field: 'age', op: 'gt', value: 60 }] }],
      },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.meta?.reason).toBe('invalid_condition');
  });

  it('flags nested CompoundCondition with malformed inner leaf', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: {
        operator: 'and',
        conditions: [{ value: 'x' }],
      },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.meta?.reason).toBe('invalid_condition');
  });

  it('does not flag a valid rule', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { field: 'age', op: 'gt', value: 60 },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors).toEqual([]);
  });

  it('accepts forbid_exercise as a valid action type', () => {
    const errors = runPass2(wrap({
      id: 'r1',
      condition: { field: 'injuries', op: 'contains', value: 'torn_meniscus' },
      actions: [{ type: 'forbid_exercise', exercise: 'barbell_back_squat' }],
    }), { rules: [invalidPersonalizationRule] });
    const errs = errors.filter((e) => e.code === 'INVALID_PERSONALIZATION_RULE');
    expect(errs).toHaveLength(0);
  });

  it('accepts in/not_in condition ops without raising INVALID_PERSONALIZATION_RULE', () => {
    const errors = runPass2(wrap({
      id: 'r2',
      condition: { field: 'cycle_day', op: 'in', value: [1, 2, 3] },
      actions: [{ type: 'forbid_exercise', exercise: 'heavy_deadlift' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors.filter((e) => e.code === 'INVALID_PERSONALIZATION_RULE')).toHaveLength(0);
  });
});
