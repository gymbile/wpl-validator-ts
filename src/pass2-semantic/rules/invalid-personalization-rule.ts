import type { SemanticRule, WalkContext } from '../walker.js';

const ACTION_TYPES = new Set([
  'modify_intensity', 'add_warmup_time', 'increase_rest', 'reduce_sets', 'reduce_reps',
  'replace_exercise', 'exclude_exercise', 'modify_exercise', 'use_schedule', 'add_activity',
]);
const ACTION_SCOPES = new Set(['activity', 'block', 'day', 'week', 'phase', 'plan']);

function emitInvalidCondition(ctx: WalkContext, path: string, message: string): void {
  ctx.emit({
    path,
    code: 'INVALID_PERSONALIZATION_RULE',
    message,
    severity: 'error',
    meta: { reason: 'invalid_condition' },
  });
}

function validateCondition(ctx: WalkContext, cond: unknown, rulePath: string): void {
  if (typeof cond !== 'object' || cond === null) {
    emitInvalidCondition(ctx, rulePath, 'condition must be an object');
    return;
  }
  const c = cond as { operator?: unknown; conditions?: unknown; field?: unknown; op?: unknown };
  // CompoundCondition: { operator: "and"|"or", conditions: [...] }
  if (c.operator !== undefined || Array.isArray(c.conditions)) {
    if (c.operator !== 'and' && c.operator !== 'or') {
      emitInvalidCondition(ctx, rulePath, "compound condition operator must be 'and' or 'or'");
      return;
    }
    if (!Array.isArray(c.conditions) || c.conditions.length === 0) {
      emitInvalidCondition(ctx, rulePath, 'compound condition requires non-empty conditions array');
      return;
    }
    for (const inner of c.conditions) {
      validateCondition(ctx, inner, rulePath);
    }
    return;
  }
  // SimpleCondition: { field, op, value }
  if (c.field === undefined && c.op === undefined) {
    emitInvalidCondition(ctx, rulePath, "condition must have 'field' or 'op'");
  }
}

export const invalidPersonalizationRule: SemanticRule = {
  code: 'INVALID_PERSONALIZATION_RULE',
  enterRule(ctx, rule, path) {
    // condition shape (recursive)
    const cond = (rule as { condition?: unknown } | null | undefined)?.condition;
    if (cond !== undefined) {
      validateCondition(ctx, cond, path);
    }

    // actions list
    const actions = (rule as { actions?: unknown } | null | undefined)?.actions;
    if (Array.isArray(actions) && actions.length === 0) {
      ctx.emit({ path, code: 'INVALID_PERSONALIZATION_RULE', message: 'actions must be a non-empty list', severity: 'error', meta: { reason: 'actions_must_be_non_empty_list' } });
    }

    // each action
    if (Array.isArray(actions)) {
      actions.forEach((action: unknown, i: number) => {
        const aPath = `${path}/actions/${i}`;
        const a = (action ?? {}) as { type?: unknown; scope?: unknown };
        if (a.type !== undefined && (typeof a.type !== 'string' || !ACTION_TYPES.has(a.type))) {
          ctx.emit({ path: aPath, code: 'INVALID_PERSONALIZATION_RULE', message: `invalid action type '${String(a.type)}'`, severity: 'error', meta: { reason: 'invalid_action_type', field: 'type', value: a.type } });
        }
        if (a.scope !== undefined && (typeof a.scope !== 'string' || !ACTION_SCOPES.has(a.scope))) {
          ctx.emit({ path: aPath, code: 'INVALID_PERSONALIZATION_RULE', message: `invalid action scope '${String(a.scope)}'`, severity: 'error', meta: { reason: 'invalid_action_scope', field: 'scope', value: a.scope } });
        }
      });
    }
  },
};
