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
      condition: { field: 'age', operator: 'gt', value: 60 },
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
      condition: { field: 'age', operator: 'gt', value: 60 },
      actions: [{ type: 'reduce_reps', scope: 'galaxy' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors[0]?.meta).toMatchObject({ reason: 'invalid_action_scope', field: 'scope', value: 'galaxy' });
  });

  it('flags empty actions list', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { field: 'age', operator: 'gt', value: 60 },
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

  it('does not flag a valid rule', () => {
    const errors = runPass2(wrap({
      id: 'rule_1',
      condition: { field: 'age', op: 'gt', value: 60 },
      actions: [{ type: 'reduce_reps', scope: 'activity' }],
    }), { rules: [invalidPersonalizationRule] });
    expect(errors).toEqual([]);
  });
});
