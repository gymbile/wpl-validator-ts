import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { emptyPhasesForType } from '../../src/pass2-semantic/rules/empty-phases-for-type';

describe('rule: EMPTY_PHASES_FOR_TYPE', () => {
  it('emits error when workout plan has zero phases', () => {
    const plan = {
      plan: { id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [], phases: [] },
    };
    const errors = runPass2(plan, { rules: [emptyPhasesForType] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'EMPTY_PHASES_FOR_TYPE',
      path: '/plan/phases',
      severity: 'error',
      meta: { plan_type: 'workout' },
    });
  });

  it('emits error for hybrid plan with zero phases', () => {
    const plan = {
      plan: { id: 'p', name: 'P', type: 'hybrid', visibility: 'private', metadata: {}, goals: [], phases: [] },
    };
    const errors = runPass2(plan, { rules: [emptyPhasesForType] });
    expect(errors[0]?.meta?.plan_type).toBe('hybrid');
  });

  it('does not emit for non-workout plan with zero phases', () => {
    const plan = {
      plan: { id: 'p', name: 'P', type: 'nutrition', visibility: 'private', metadata: {}, goals: [], phases: [] },
    };
    const errors = runPass2(plan, { rules: [emptyPhasesForType] });
    expect(errors).toEqual([]);
  });

  it('does not emit when phases is non-empty', () => {
    const plan = {
      plan: {
        id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
        phases: [{ id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' }, weeks: [] }],
      },
    };
    const errors = runPass2(plan, { rules: [emptyPhasesForType] });
    expect(errors).toEqual([]);
  });
});
