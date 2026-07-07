import { describe, it, expect } from 'vitest';
import { runPass2 } from '../../src/pass2-semantic/index.js';
import { goalCategoryOffVocab } from '../../src/pass2-semantic/rules/goal-category-off-vocab.js';

const wrap = (goals: unknown[]) => ({
  plan: {
    id: 'p', name: 'P', type: 'workout', visibility: 'private', metadata: {}, goals,
    phases: [],
  },
});

describe('rule: GOAL_CATEGORY_OFF_VOCAB', () => {
  it('emits no warning for a known category', () => {
    const errors = runPass2(wrap([{ id: 'g1', type: 'primary', category: 'strength' }]), {
      rules: [goalCategoryOffVocab],
    });
    expect(errors).toEqual([]);
  });

  it('emits no warning for general_fitness (added in 1.9.0)', () => {
    const errors = runPass2(wrap([{ id: 'g1', type: 'primary', category: 'general_fitness' }]), {
      rules: [goalCategoryOffVocab],
    });
    expect(errors).toEqual([]);
  });

  it('emits no warning for category "custom" (escape hatch)', () => {
    const errors = runPass2(wrap([{ id: 'g1', type: 'primary', category: 'custom' }]), {
      rules: [goalCategoryOffVocab],
    });
    expect(errors).toEqual([]);
  });

  it('emits exactly one warning for an off-list category', () => {
    const errors = runPass2(wrap([{ id: 'g1', type: 'primary', category: 'unknown_thing' }]), {
      rules: [goalCategoryOffVocab],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'GOAL_CATEGORY_OFF_VOCAB',
      severity: 'warning',
    });
    expect(errors[0].message).toContain('unknown_thing');
  });

  it('emits one warning per off-list goal category', () => {
    const errors = runPass2(wrap([
      { id: 'g1', type: 'primary', category: 'foo' },
      { id: 'g2', type: 'secondary', category: 'strength' },
      { id: 'g3', type: 'secondary', category: 'bar' },
    ]), { rules: [goalCategoryOffVocab] });
    expect(errors).toHaveLength(2);
  });

  it('emits no warning when goals array is empty', () => {
    const errors = runPass2(wrap([]), { rules: [goalCategoryOffVocab] });
    expect(errors).toEqual([]);
  });

  it('warning-severity means validation result is still valid (no errors)', () => {
    // The rule only produces warnings; the overall result type doesn't flip to invalid.
    const errors = runPass2(wrap([{ id: 'g1', type: 'primary', category: 'off_list' }]), {
      rules: [goalCategoryOffVocab],
    });
    const hasError = errors.some((e) => e.severity === 'error');
    expect(hasError).toBe(false);
  });
});
