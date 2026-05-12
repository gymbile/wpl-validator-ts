import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { invalidPrescription } from '../../src/pass2-semantic/rules/invalid-prescription';

const planWithActivity = (activity: any) => ({
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

describe('rule: INVALID_PRESCRIPTION', () => {
  it('flags sets_reps prescription with neither sets nor reps', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'sets_reps' },
    }), { rules: [invalidPrescription] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'INVALID_PRESCRIPTION',
      path: '/plan/phases/0/weeks/0/days/0/blocks/0/activities/0/prescription',
      severity: 'error',
      meta: { reason: 'sets_reps_requires_sets_or_reps' },
    });
  });

  it('flags time prescription without duration', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'plank',
      prescription: { type: 'time' },
    }), { rules: [invalidPrescription] });
    expect(errors[0]?.meta?.reason).toBe('time_requires_duration');
  });

  it('flags missing type', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { sets: 3, reps: 10 },
    }), { rules: [invalidPrescription] });
    expect(errors[0]?.meta?.reason).toBe('missing_type');
  });

  it('flags unknown type', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'forever' },
    }), { rules: [invalidPrescription] });
    expect(errors[0]).toMatchObject({
      meta: { reason: 'unknown_type', prescription_type: 'forever' },
    });
  });

  it('does not flag valid sets_reps prescription', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'sets_reps', sets: 3, reps: 10 },
    }), { rules: [invalidPrescription] });
    expect(errors).toEqual([]);
  });

  it('does not fire on non-exercise activity types', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'simple', name: 'walk',
    }), { rules: [invalidPrescription] });
    expect(errors).toEqual([]);
  });

  // --- repair_hint (1.7.0) ---

  it('repair_hint for sets_reps missing sets+reps lists what is missing', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'sets_reps' },
    }), { rules: [invalidPrescription] });
    const hint = errors[0]!.repair_hint;
    expect(hint).toBeDefined();
    expect(hint!.action).toBe('fix_prescription');
    expect(hint!.target_path).toBe('/plan/phases/0/weeks/0/days/0/blocks/0/activities/0/prescription');
    expect(hint!.missing).toEqual(['sets', 'reps']);
    expect(hint!.expected_shape).toContain('sets_reps');
  });

  it('repair_hint for missing type lists allowed_values', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { sets: 3, reps: 10 },
    }), { rules: [invalidPrescription] });
    const hint = errors[0]!.repair_hint;
    expect(hint!.allowed_values).toContain('sets_reps');
    expect(hint!.allowed_values).toContain('time');
    expect(hint!.allowed_values).toContain('intervals');
  });

  it('repair_hint for unknown type lists allowed_values', () => {
    const errors = runPass2(planWithActivity({
      id: 'a1', type: 'exercise', exercise_ref: 'push_up',
      prescription: { type: 'forever' },
    }), { rules: [invalidPrescription] });
    const hint = errors[0]!.repair_hint;
    expect(hint!.action).toBe('fix_prescription');
    expect(hint!.allowed_values).toContain('time');
  });
});
