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
});
