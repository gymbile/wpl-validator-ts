import { describe, it, expect } from 'vitest';
import { validate, getRepairHints } from '../src/index';

describe('validate (entry point)', () => {
  it('returns valid: true for a minimal valid plan', () => {
    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.6.0',
      plan: {
        id: 'plan_test',
        name: 'Test',
        type: 'workout',
        visibility: 'private',
        metadata: {},
        goals: [],
        phases: [
          {
            id: 'phase_1',
            name: 'P1',
            order: 1,
            duration: { value: 1, unit: 'weeks' },
            weeks: [
              {
                id: 'week_1',
                name: 'W1',
                order: 1,
                days: [{ id: 'day_1', day_of_week: 1, type: 'rest' }],
              },
            ],
          },
        ],
      },
    };
    const result = validate(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid: false with SCHEMA_VIOLATION for malformed input', () => {
    const plan = { not_a_wpl_plan: true };
    const result = validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SCHEMA_VIOLATION')).toBe(true);
  });

  it('getRepairHints surfaces the hint from PHASE_DURATION_MISMATCH', () => {
    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.6.0',
      plan: {
        id: 'plan_test',
        name: 'Test',
        type: 'workout',
        visibility: 'private',
        metadata: {},
        goals: [],
        phases: [
          {
            id: 'phase_1',
            name: 'Phase 1: Foundation',
            order: 1,
            duration: { value: 4, unit: 'weeks' },
            weeks: [
              {
                id: 'week_1',
                name: 'W1',
                order: 1,
                days: [{ id: 'day_1', day_of_week: 1, type: 'rest' }],
              },
            ],
          },
        ],
      },
    };
    const result = validate(plan);
    const hints = getRepairHints(result);
    expect(hints.length).toBeGreaterThanOrEqual(1);
    const phaseHint = hints.find((h) => h.code === 'PHASE_DURATION_MISMATCH');
    expect(phaseHint).toBeDefined();
    expect(phaseHint!.hint.action).toBe('add_weeks');
    expect(phaseHint!.hint.parent_name).toBe('Phase 1: Foundation');
    expect(phaseHint!.hint.missing).toEqual([2, 3, 4]);
  });
});
