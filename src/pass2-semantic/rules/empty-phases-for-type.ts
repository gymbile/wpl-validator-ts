import type { SemanticRule } from '../walker.js';

const TYPES_REQUIRING_PHASES = new Set(['workout', 'hybrid']);

export const emptyPhasesForType: SemanticRule = {
  code: 'EMPTY_PHASES_FOR_TYPE',
  enterPlan(ctx, plan) {
    if (!TYPES_REQUIRING_PHASES.has(plan.type)) return;
    const phases = Array.isArray(plan.phases) ? plan.phases : [];
    if (phases.length > 0) return;
    ctx.emit({
      path: '/plan/phases',
      code: 'EMPTY_PHASES_FOR_TYPE',
      message: `Plan type '${plan.type}' requires at least one phase`,
      severity: 'error',
      meta: { plan_type: plan.type },
    });
  },
};
