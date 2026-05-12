import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic';
import { activityBlockMismatch } from '../../src/pass2-semantic/rules/activity-block-mismatch';

const wrap = (plan: unknown) => ({ plan });

function makeBlock(blockType: string, activityType: string) {
  return wrap({
    id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals: [],
    phases: [{
      id: 'phase_1', name: 'P1', order: 1, duration: { value: 1, unit: 'weeks' },
      weeks: [{
        id: 'week_1', name: 'Week 1', order: 1,
        days: [{
          id: 'day_1', name: 'D1', type: 'training',
          blocks: [{
            id: 'block_1', type: blockType, order: 1,
            activities: [{ id: 'act_1', type: activityType }],
          }],
        }],
      }],
    }],
  });
}

describe('rule: ACTIVITY_BLOCK_MISMATCH', () => {
  // --- violation cases ---

  it('emits error for nutrition in cooldown block', () => {
    const errors = runPass2(makeBlock('cooldown', 'nutrition'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'ACTIVITY_BLOCK_MISMATCH',
      path: '/plan/phases/0/weeks/0/days/0/blocks/0/activities/0',
      severity: 'error',
      meta: { activity_type: 'nutrition', block_type: 'cooldown' },
    });
    expect(errors[0]!.message).toContain("'nutrition'");
    expect(errors[0]!.message).toContain("'cooldown'");
  });

  it('emits error for exercise in nutrition block', () => {
    const errors = runPass2(makeBlock('nutrition', 'exercise'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'ACTIVITY_BLOCK_MISMATCH',
      meta: { activity_type: 'exercise', block_type: 'nutrition' },
    });
  });

  it('emits error for nutrition in warmup block', () => {
    const errors = runPass2(makeBlock('warmup', 'nutrition'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'ACTIVITY_BLOCK_MISMATCH',
      meta: { activity_type: 'nutrition', block_type: 'warmup' },
    });
  });

  it('emits error for exercise in meditation block', () => {
    const errors = runPass2(makeBlock('meditation', 'exercise'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'ACTIVITY_BLOCK_MISMATCH',
      meta: { activity_type: 'exercise', block_type: 'meditation' },
    });
  });

  it('emits error for nutrition in education block', () => {
    const errors = runPass2(makeBlock('education', 'nutrition'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'ACTIVITY_BLOCK_MISMATCH',
      meta: { activity_type: 'nutrition', block_type: 'education' },
    });
  });

  it('emits error for meditation in assessment block', () => {
    const errors = runPass2(makeBlock('assessment', 'meditation'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'ACTIVITY_BLOCK_MISMATCH',
      meta: { activity_type: 'meditation', block_type: 'assessment' },
    });
  });

  // --- allowed cases ---

  it('does not emit for exercise in main block', () => {
    const errors = runPass2(makeBlock('main', 'exercise'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for cardio in warmup block', () => {
    const errors = runPass2(makeBlock('warmup', 'cardio'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for recovery in cooldown block', () => {
    const errors = runPass2(makeBlock('cooldown', 'recovery'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for cardio in cooldown block', () => {
    const errors = runPass2(makeBlock('cooldown', 'cardio'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for meditation in cooldown block', () => {
    const errors = runPass2(makeBlock('cooldown', 'meditation'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for nutrition in nutrition block', () => {
    const errors = runPass2(makeBlock('nutrition', 'nutrition'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for meditation in meditation block', () => {
    const errors = runPass2(makeBlock('meditation', 'meditation'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for exercise in assessment block', () => {
    const errors = runPass2(makeBlock('assessment', 'exercise'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for habit in education block', () => {
    const errors = runPass2(makeBlock('education', 'habit'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  // --- escape hatches accepted everywhere ---

  it('does not emit for simple in warmup block', () => {
    const errors = runPass2(makeBlock('warmup', 'simple'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for simple in cooldown block', () => {
    const errors = runPass2(makeBlock('cooldown', 'simple'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for sub_plan in nutrition block', () => {
    const errors = runPass2(makeBlock('nutrition', 'sub_plan'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  it('does not emit for sub_plan in meditation block', () => {
    const errors = runPass2(makeBlock('meditation', 'sub_plan'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  // --- unknown block type is ignored ---

  it('does not emit for unknown block type', () => {
    const errors = runPass2(makeBlock('custom_block', 'exercise'), { rules: [activityBlockMismatch] });
    expect(errors).toEqual([]);
  });

  // --- meta includes allowed list ---

  it('includes allowed list in meta', () => {
    const errors = runPass2(makeBlock('cooldown', 'nutrition'), { rules: [activityBlockMismatch] });
    expect(errors[0]!.meta!.allowed).toContain('cardio');
    expect(errors[0]!.meta!.allowed).toContain('recovery');
    expect(errors[0]!.meta!.allowed).not.toContain('nutrition');
  });

  // --- repair_hint (1.7.0) ---

  it('attaches repair_hint with action=fix_activity and allowed_values', () => {
    const errors = runPass2(makeBlock('warmup', 'nutrition'), { rules: [activityBlockMismatch] });
    expect(errors).toHaveLength(1);
    const hint = errors[0]!.repair_hint;
    expect(hint).toBeDefined();
    expect(hint!.action).toBe('fix_activity');
    expect(hint!.target_path).toBe('/plan/phases/0/weeks/0/days/0/blocks/0/activities/0');
    expect(hint!.allowed_values).toContain('cardio');
    expect(hint!.allowed_values).toContain('recovery');
    expect(hint!.allowed_values).not.toContain('nutrition');
    expect(hint!.expected_shape).toContain('warmup');
  });
});
