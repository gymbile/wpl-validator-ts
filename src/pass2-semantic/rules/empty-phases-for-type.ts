import type { SemanticRule } from '../walker.js';
import type { RepairHint } from '../../types.js';

const TYPES_REQUIRING_PHASES = new Set(['workout', 'hybrid']);

const DSL_PHASE_EXAMPLE = `PHASES
  PHASE "Phase 1: Foundation" (4 weeks):
    WEEK 1:
      DAY Monday training 45m "Session name":
        warmup:
          cycling 5m zone2
        main straight_sets:
          <exercise_name> 3x8..12 rpe 7 rest 90 seconds
        cooldown:
          <stretch_name> 30s`;

export const emptyPhasesForType: SemanticRule = {
  code: 'EMPTY_PHASES_FOR_TYPE',
  enterPlan(ctx, plan) {
    const planType = plan.type;
    if (typeof planType !== 'string' || !TYPES_REQUIRING_PHASES.has(planType)) return;
    const phases = Array.isArray(plan.phases) ? plan.phases : [];
    if (phases.length > 0) return;

    const repair_hint: RepairHint = {
      action: 'add_phases',
      target_path: '/plan/phases',
      expected_count: 1,
      actual_count: 0,
      expected_shape: `plan.phases must be a non-empty array of Phase objects for plan.type='${planType}'`,
      context_dsl_example: DSL_PHASE_EXAMPLE,
    };

    ctx.emit({
      path: '/plan/phases',
      code: 'EMPTY_PHASES_FOR_TYPE',
      message: `Plan type '${planType}' requires at least one phase`,
      severity: 'error',
      meta: { plan_type: planType },
      repair_hint,
    });
  },
};
