import { describe, it, expect } from 'vitest';
import { runPass2, type WalkContext } from '../../src/pass2-semantic';

describe('Pass 2 walker', () => {
  it('visits plan, phases, weeks, days, blocks, activities in order', () => {
    const visits: string[] = [];
    const trackingRule = {
      code: 'DUPLICATE_ID' as const,
      enterPlan: () => visits.push('plan'),
      enterPhase: () => visits.push('phase'),
      enterWeek: () => visits.push('week'),
      enterDay: () => visits.push('day'),
      enterBlock: () => visits.push('block'),
      enterActivity: () => visits.push('activity'),
    };

    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.0.0',
      plan: {
        id: 'p1', name: 'P', type: 'workout', visibility: 'private',
        metadata: {}, goals: [], phases: [
          {
            id: 'phase_1', name: 'X', order: 1,
            duration: { value: 1, unit: 'weeks' },
            weeks: [{
              id: 'week_1',
              days: [{
                id: 'day_1', name: 'D', type: 'workout',
                blocks: [{
                  id: 'main', type: 'main', order: 1,
                  activities: [{ id: 'a1', type: 'simple', name: 'walk' }],
                }],
              }],
            }],
          },
        ],
      },
    };

    runPass2(plan, { rules: [trackingRule] });

    expect(visits).toEqual(['plan', 'phase', 'week', 'day', 'block', 'activity']);
  });

  it('emits errors collected via ctx.emit', () => {
    const rule = {
      code: 'EMPTY_PHASES_FOR_TYPE' as const,
      enterPlan: (ctx: WalkContext) => ctx.emit({
        path: '/plan/phases',
        code: 'EMPTY_PHASES_FOR_TYPE',
        message: 'no phases',
        severity: 'error',
      }),
    };
    const plan = {
      $schema: 'https://wpl.dev/schemas/wpl/v1.schema.json',
      version: '1.0.0',
      plan: { id: 'p1', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [], phases: [] },
    };
    const errors = runPass2(plan, { rules: [rule] });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('EMPTY_PHASES_FOR_TYPE');
  });
});
