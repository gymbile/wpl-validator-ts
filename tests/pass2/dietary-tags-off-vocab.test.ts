import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic/index.js';
import { dietaryTagsOffVocab } from '../../src/pass2-semantic/rules/dietary-tags-off-vocab.js';

const wrapWithActivity = (activity: unknown) => ({
  plan: {
    id: 'p', name: 'P', type: 'nutrition', visibility: 'private', metadata: {},
    goals: [],
    phases: [{
      id: 'ph1', name: 'Phase 1', order: 1,
      weeks: [{
        id: 'w1',
        days: [{
          id: 'd1',
          blocks: [{
            id: 'b1',
            type: 'nutrition',
            activities: [activity],
          }],
        }],
      }],
    }],
  },
});

describe('rule: DIETARY_TAGS_OFF_VOCAB', () => {
  it('emits no warning for a known tag', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal', dietary_tags: ['vegan'],
    }), { rules: [dietaryTagsOffVocab] });
    expect(errors).toEqual([]);
  });

  it('emits no warning when dietary_tags is absent', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal',
    }), { rules: [dietaryTagsOffVocab] });
    expect(errors).toEqual([]);
  });

  it('emits no warning when dietary_tags is empty array', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal', dietary_tags: [],
    }), { rules: [dietaryTagsOffVocab] });
    expect(errors).toEqual([]);
  });

  it('emits no warning for a non-nutrition activity even with unknown tags', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'exercise', name: 'Push-up', dietary_tags: ['mystery_tag'],
    }), { rules: [dietaryTagsOffVocab] });
    expect(errors).toEqual([]);
  });

  it('emits exactly one warning for one off-list tag', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal', dietary_tags: ['pescatarian'],
    }), { rules: [dietaryTagsOffVocab] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'DIETARY_TAGS_OFF_VOCAB',
      severity: 'warning',
    });
    expect(errors[0].message).toContain('pescatarian');
  });

  it('emits one warning per off-list tag', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal',
      dietary_tags: ['vegan', 'carnivore', 'paleo'],
    }), { rules: [dietaryTagsOffVocab] });
    // 'vegan' is valid, 'carnivore' and 'paleo' are not
    expect(errors).toHaveLength(2);
  });

  it('all known tags emit no warnings', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal',
      dietary_tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
    }), { rules: [dietaryTagsOffVocab] });
    expect(errors).toEqual([]);
  });

  it('warning-severity means validation result is still valid (no errors)', () => {
    const errors = runPass2(wrapWithActivity({
      id: 'a1', type: 'nutrition', name: 'Meal', dietary_tags: ['mystery'],
    }), { rules: [dietaryTagsOffVocab] });
    const hasError = errors.some((e) => e.severity === 'error');
    expect(hasError).toBe(false);
  });
});
