import { describe, it, expect } from 'vitest';
import { runPass1 } from '../src/pass1-schema';

describe('Pass 1 — schema validation', () => {
  it('returns no errors for a minimal valid plan', () => {
    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.0.0',
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
    const result = runPass1(plan);
    expect(result).toEqual([]);
  });

  it('emits SCHEMA_VIOLATION with RFC 6901 path for unknown enum', () => {
    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.0.0',
      plan: {
        id: 'plan_test',
        name: 'Test',
        type: 'intergalactic_disco',
        visibility: 'private',
        metadata: {},
        goals: [],
        phases: [],
      },
    };
    const errors = runPass1(plan);
    expect(errors.length).toBeGreaterThan(0);
    const enumErr = errors.find((e) => e.path === '/plan/type');
    expect(enumErr).toBeDefined();
    expect(enumErr?.code).toBe('SCHEMA_VIOLATION');
    expect(enumErr?.severity).toBe('error');
    expect(enumErr?.meta?.keyword).toBe('enum');
  });

  it('emits SCHEMA_VIOLATION for missing required field', () => {
    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.0.0',
      plan: {
        // missing `id`
        name: 'No ID',
        type: 'workout',
        visibility: 'private',
        metadata: {},
        goals: [],
        phases: [],
      },
    };
    const errors = runPass1(plan);
    const missingId = errors.find(
      (e) => e.code === 'SCHEMA_VIOLATION' && e.path === '/plan' && e.meta?.keyword === 'required',
    );
    expect(missingId).toBeDefined();
  });
});
