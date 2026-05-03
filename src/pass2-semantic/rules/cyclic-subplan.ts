import type { SemanticRule } from '../walker.js';

/**
 * Detects sub-plan reference cycles.
 *
 * Single-plan scope: catches self-references where a `SubPlanActivity`
 * has `sub_plan_ref` equal to the containing plan's `id`. Cross-plan
 * cycles (`A → B → A`) require a `sub_plans` resolution map at validate
 * time and are deferred until that API extension lands.
 */
export const cyclicSubplan: SemanticRule = {
  code: 'CYCLIC_SUBPLAN',

  enterPlan(ctx, plan) {
    const id = (plan as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) {
      ctx.scope.set('cur:plan_id', id);
    }
  },

  enterActivity(ctx, activity, path) {
    if ((activity as { type?: unknown }).type !== 'sub_plan') return;
    const ref = (activity as { sub_plan_ref?: unknown }).sub_plan_ref;
    if (typeof ref !== 'string' || ref.length === 0) return;

    const planId = ctx.scope.get('cur:plan_id');
    if (typeof planId === 'string' && ref === planId) {
      ctx.emit({
        path,
        code: 'CYCLIC_SUBPLAN',
        message: `Sub-plan reference '${ref}' creates a self-cycle`,
        severity: 'error',
        meta: { cycle: [planId, ref] },
      });
    }
  },
};
