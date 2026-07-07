import type { SemanticRule } from '../walker.js';
import { GOAL_CATEGORIES } from '../../data/goal-categories.generated.js';

const KNOWN = new Set<string>(GOAL_CATEGORIES);

export const goalCategoryOffVocab: SemanticRule = {
  code: 'GOAL_CATEGORY_OFF_VOCAB',
  enterPlan(ctx, plan) {
    const goals = Array.isArray(plan.goals) ? plan.goals : [];
    goals.forEach((goalRaw: unknown, gi: number) => {
      if (typeof goalRaw !== 'object' || goalRaw === null) return;
      const goal = goalRaw as Record<string, unknown>;
      const category = goal.category;
      if (typeof category !== 'string') return;
      // "custom" is the spec-blessed escape hatch — never warn on it
      if (category === 'custom' || KNOWN.has(category)) return;
      ctx.emit({
        path: `/plan/goals/${gi}`,
        code: 'GOAL_CATEGORY_OFF_VOCAB',
        message: `Goal category "${category}" is not in the recommended vocabulary (see data/goal-categories.json). Use "custom" for bespoke categories.`,
        severity: 'warning',
        meta: { category },
      });
    });
  },
};
