import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { phaseDurationMismatch } from '../../src/pass2-semantic/rules/phase-duration-mismatch';

const wrap = (phase: any) => ({
  plan: {
    id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
    phases: [phase],
  },
});

describe('rule: PHASE_DURATION_MISMATCH', () => {
  it('flags weeks-unit duration that does not match weeks array length', () => {
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'P1', order: 1,
      duration: { value: 3, unit: 'weeks' },
      weeks: [
        { id: 'w1', days: [{ id: 'd1', name: 'D', type: 'rest' }] },
        { id: 'w2', days: [{ id: 'd2', name: 'D', type: 'rest' }] },
      ],
    }), { rules: [phaseDurationMismatch] });
    expect(errors[0]).toMatchObject({
      code: 'PHASE_DURATION_MISMATCH',
      path: '/plan/phases/0',
      severity: 'warning',
      meta: { declared_value: 3, declared_unit: 'weeks', weeks_count: 2 },
    });
  });

  it('does not flag matching duration', () => {
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'P1', order: 1,
      duration: { value: 2, unit: 'weeks' },
      weeks: [
        { id: 'w1', days: [{ id: 'd1', name: 'D', type: 'rest' }] },
        { id: 'w2', days: [{ id: 'd2', name: 'D', type: 'rest' }] },
      ],
    }), { rules: [phaseDurationMismatch] });
    expect(errors).toEqual([]);
  });

  it('flags days-unit duration off by more than 1 week', () => {
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'P1', order: 1,
      duration: { value: 30, unit: 'days' },
      weeks: [{ id: 'w1', days: [{ id: 'd1', name: 'D', type: 'rest' }] }],
    }), { rules: [phaseDurationMismatch] });
    // 30 days = ~4 weeks expected, weeks_count = 1, abs(4-1) = 3 > 1
    expect(errors).toHaveLength(1);
  });

  it('does not flag empty weeks array', () => {
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'P1', order: 1,
      duration: { value: 5, unit: 'weeks' },
      weeks: [],
    }), { rules: [phaseDurationMismatch] });
    expect(errors).toEqual([]);
  });

  // ---- repair_hint (1.7.0) ------------------------------------------------

  it('attaches repair_hint with missing week numbers when under-emitted', () => {
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'Phase 1: Foundation', order: 1,
      duration: { value: 4, unit: 'weeks' },
      weeks: [{ id: 'w1', days: [{ id: 'd1', name: 'D', type: 'rest' }] }],
    }), { rules: [phaseDurationMismatch] });

    expect(errors).toHaveLength(1);
    const hint = errors[0]!.repair_hint;
    expect(hint).toBeDefined();
    expect(hint!.action).toBe('add_weeks');
    expect(hint!.target_path).toBe('/plan/phases/0/weeks');
    expect(hint!.parent_name).toBe('Phase 1: Foundation');
    expect(hint!.expected_count).toBe(4);
    expect(hint!.actual_count).toBe(1);
    expect(hint!.missing).toEqual([2, 3, 4]);
    expect(hint!.context_dsl_example).toContain('WEEK {n}:');
    expect(hint!.context_dsl_example).toContain('DAY Monday');
  });

  it('still emits the error but with no missing list when over-emitted', () => {
    // Declared 2 weeks, 4 actually present. The agent must shorten — there
    // is nothing to generate, so `missing` is absent.
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'P1', order: 1,
      duration: { value: 2, unit: 'weeks' },
      weeks: [
        { id: 'w1', days: [] },
        { id: 'w2', days: [] },
        { id: 'w3', days: [] },
        { id: 'w4', days: [] },
      ],
    }), { rules: [phaseDurationMismatch] });

    expect(errors).toHaveLength(1);
    const hint = errors[0]!.repair_hint;
    expect(hint).toBeDefined();
    expect(hint!.expected_count).toBe(2);
    expect(hint!.actual_count).toBe(4);
    expect(hint!.missing).toBeUndefined();
    expect(hint!.context_dsl_example).toBeUndefined();
  });

  it('emits meta.missing_week_numbers mirroring repair_hint.missing', () => {
    const errors = runPass2(wrap({
      id: 'phase_1', name: 'P1', order: 1,
      duration: { value: 12, unit: 'weeks' },
      weeks: [{ id: 'w1', days: [{ id: 'd1', name: 'D', type: 'rest' }] }],
    }), { rules: [phaseDurationMismatch] });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.meta).toMatchObject({
      declared_value: 12,
      declared_unit: 'weeks',
      weeks_count: 1,
      missing_week_numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });
    expect(errors[0]!.repair_hint!.missing).toHaveLength(11);
  });
});
