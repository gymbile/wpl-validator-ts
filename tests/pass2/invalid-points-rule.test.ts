import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { invalidPointsRule } from '../../src/pass2-semantic/rules/invalid-points-rule';

const wrap = (rule: any) => ({
  plan: {
    id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [], phases: [],
    progress: { points_system: { rules: [rule] } },
  },
});

describe('rule: INVALID_POINTS_RULE', () => {
  it('flags negative points', () => {
    const errors = runPass2(wrap({ action: 'complete_workout', points: -10 }), { rules: [invalidPointsRule] });
    expect(errors[0]).toMatchObject({
      code: 'INVALID_POINTS_RULE',
      path: '/plan/progress/points_system/rules/0',
      meta: { reason: 'points_must_be_non_negative_integer' },
    });
  });

  it('flags missing action', () => {
    const errors = runPass2(wrap({ points: 5 }), { rules: [invalidPointsRule] });
    expect(errors[0]?.meta?.reason).toBe('missing_action');
  });

  it('flags missing points', () => {
    const errors = runPass2(wrap({ action: 'x' }), { rules: [invalidPointsRule] });
    expect(errors[0]?.meta?.reason).toBe('missing_points');
  });

  it('flags non-integer points', () => {
    const errors = runPass2(wrap({ action: 'x', points: 1.5 }), { rules: [invalidPointsRule] });
    expect(errors[0]?.meta?.reason).toBe('points_must_be_non_negative_integer');
  });

  it('does not flag valid rule', () => {
    const errors = runPass2(wrap({ action: 'complete_workout', points: 10 }), { rules: [invalidPointsRule] });
    expect(errors).toEqual([]);
  });
});
