import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { unresolvedRef } from '../../src/pass2-semantic/rules/unresolved-ref';

const wrap = (activity: any) => ({
  plan: {
    id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
    phases: [{
      id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' },
      weeks: [{
        id: 'week_1',
        days: [{
          id: 'day_1', name: 'D1', type: 'workout',
          blocks: [{ id: 'main', type: 'main', order: 1, activities: [activity] }],
        }],
      }],
    }],
  },
});

describe('rule: UNRESOLVED_REF', () => {
  it('flags unresolved exercise_ref when catalog is provided', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'exercise', exercise_ref: 'dumbbell_curl',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), {
      rules: [unresolvedRef],
      catalog: { exercises: new Set(['push_up', 'squat']) },
    });
    expect(errors[0]).toMatchObject({
      code: 'UNRESOLVED_REF',
      path: '/plan/phases/0/weeks/0/days/0/blocks/0/activities/0/exercise_ref',
      severity: 'error',
      meta: { ref_kind: 'exercise', ref_value: 'dumbbell_curl' },
    });
  });

  it('does not flag when catalog is omitted', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'exercise', exercise_ref: 'dumbbell_curl',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), { rules: [unresolvedRef] });
    expect(errors).toEqual([]);
  });

  it('does not flag a resolvable ref', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), {
      rules: [unresolvedRef],
      catalog: { exercises: new Set(['push_up', 'squat']) },
    });
    expect(errors).toEqual([]);
  });

  it('flags meal_ref against meals catalog', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'nutrition', name: 'Breakfast', meal_ref: 'unicorn_porridge',
      timing: { type: 'absolute' },
    }), {
      rules: [unresolvedRef],
      catalog: { meals: new Set(['oatmeal']) },
    });
    expect(errors[0]?.meta).toMatchObject({ ref_kind: 'meal', ref_value: 'unicorn_porridge' });
  });

  it('errors with CATALOG_REQUIRED when requireCatalog is set and no catalog given', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), {
      rules: [unresolvedRef],
      requireCatalog: true,
    });
    expect(errors.some((e) => e.code === 'CATALOG_REQUIRED')).toBe(true);
  });

  it('does not emit CATALOG_REQUIRED when a catalog is provided', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), {
      rules: [unresolvedRef],
      requireCatalog: true,
      catalog: { exercises: new Set(['push_up']) },
    });
    expect(errors.some((e) => e.code === 'CATALOG_REQUIRED')).toBe(false);
  });

  it('resolves refs case-insensitively with a warning-free match', () => {
    const errors = runPass2(wrap({
      id: 'a1', type: 'exercise', exercise_ref: 'Push_Up',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), {
      rules: [unresolvedRef],
      catalog: { exercises: new Set(['push_up']) },
    });
    expect(errors.some((e) => e.code === 'UNRESOLVED_REF')).toBe(false);
  });
});
