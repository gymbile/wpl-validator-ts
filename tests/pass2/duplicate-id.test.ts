import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { duplicateId } from '../../src/pass2-semantic/rules/duplicate-id';

const wrap = (plan: any) => ({ plan });

describe('rule: DUPLICATE_ID', () => {
  it('detects duplicate day.id within week', () => {
    const errors = runPass2(wrap({
      id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
      phases: [{
        id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' },
        weeks: [{
          id: 'week_1',
          days: [
            { id: 'day_1', name: 'D1', type: 'rest' },
            { id: 'day_1', name: 'D1 again', type: 'rest' },
          ],
        }],
      }],
    }), { rules: [duplicateId] });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'DUPLICATE_ID',
      path: '/plan/phases/0/weeks/0/days/1',
      severity: 'error',
      meta: {
        duplicate_id: 'day_1',
        scope: 'week:week_1',
        first_occurrence: '/plan/phases/0/weeks/0/days/0',
      },
    });
  });

  it('detects duplicate week.id within phase', () => {
    const errors = runPass2(wrap({
      id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
      phases: [{
        id: 'phase_1', name: 'P1', order: 1, duration: { value: 2, unit: 'weeks' },
        weeks: [
          { id: 'week_1', days: [{ id: 'd1', name: 'D1', type: 'rest' }] },
          { id: 'week_1', days: [{ id: 'd2', name: 'D2', type: 'rest' }] },
        ],
      }],
    }), { rules: [duplicateId] });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.meta).toMatchObject({
      duplicate_id: 'week_1',
      scope: 'phase:phase_1',
      first_occurrence: '/plan/phases/0/weeks/0',
    });
  });

  it('detects duplicate phase.id within plan', () => {
    const errors = runPass2(wrap({
      id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
      phases: [
        { id: 'phase_1', name: 'A', order: 1, duration: { value: 1, unit: 'weeks' }, weeks: [] },
        { id: 'phase_1', name: 'B', order: 2, duration: { value: 1, unit: 'weeks' }, weeks: [] },
      ],
    }), { rules: [duplicateId] });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.meta?.scope).toBe('plan');
  });

  it('detects duplicate block.id within day', () => {
    const errors = runPass2(wrap({
      id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
      phases: [{
        id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' },
        weeks: [{
          id: 'week_1',
          days: [{
            id: 'day_1', name: 'D1', type: 'workout',
            blocks: [
              { id: 'main', type: 'main', order: 1, activities: [] },
              { id: 'main', type: 'main', order: 2, activities: [] },
            ],
          }],
        }],
      }],
    }), { rules: [duplicateId] });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.meta?.scope).toBe('day:day_1');
  });

  it('detects duplicate activity.id within day (across blocks)', () => {
    const errors = runPass2(wrap({
      id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
      phases: [{
        id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' },
        weeks: [{
          id: 'week_1',
          days: [{
            id: 'day_1', name: 'D1', type: 'workout',
            blocks: [
              { id: 'main', type: 'main', order: 1, activities: [{ id: 'a1', type: 'simple', name: 'walk' }] },
              { id: 'cool', type: 'cooldown', order: 2, activities: [{ id: 'a1', type: 'simple', name: 'stretch' }] },
            ],
          }],
        }],
      }],
    }), { rules: [duplicateId] });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.meta).toMatchObject({
      duplicate_id: 'a1',
      scope: 'day:day_1',
    });
  });

  it('does not emit for unique IDs', () => {
    const errors = runPass2(wrap({
      id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
      phases: [{
        id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' },
        weeks: [{
          id: 'week_1',
          days: [
            { id: 'day_1', name: 'D1', type: 'rest' },
            { id: 'day_2', name: 'D2', type: 'rest' },
          ],
        }],
      }],
    }), { rules: [duplicateId] });
    expect(errors).toEqual([]);
  });
});
