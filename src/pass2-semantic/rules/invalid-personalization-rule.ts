import type { SemanticRule } from '../walker.js';

const ACTION_TYPES = new Set([
  'modify_intensity', 'add_warmup_time', 'increase_rest', 'reduce_sets', 'reduce_reps',
  'replace_exercise', 'exclude_exercise', 'modify_exercise', 'use_schedule', 'add_activity',
]);
const ACTION_SCOPES = new Set(['activity', 'block', 'day', 'week', 'phase', 'plan']);

export const invalidPersonalizationRule: SemanticRule = {
  code: 'INVALID_PERSONALIZATION_RULE',
  enterRule(ctx, rule, path) {
    // condition shape
    const cond = rule?.condition;
    if (cond !== undefined) {
      if (typeof cond !== 'object' || cond === null) {
        ctx.emit({ path, code: 'INVALID_PERSONALIZATION_RULE', message: 'condition must be an object', severity: 'error', meta: { reason: 'invalid_condition' } });
      } else if (cond.field === undefined && cond.op === undefined) {
        ctx.emit({ path, code: 'INVALID_PERSONALIZATION_RULE', message: "condition must have 'field' or 'op'", severity: 'error', meta: { reason: 'invalid_condition' } });
      }
    }

    // actions list
    const actions = rule?.actions;
    if (Array.isArray(actions) && actions.length === 0) {
      ctx.emit({ path, code: 'INVALID_PERSONALIZATION_RULE', message: 'actions must be a non-empty list', severity: 'error', meta: { reason: 'actions_must_be_non_empty_list' } });
    }

    // each action
    if (Array.isArray(actions)) {
      actions.forEach((action: any, i: number) => {
        const aPath = `${path}/actions/${i}`;
        if (action?.type !== undefined && !ACTION_TYPES.has(action.type)) {
          ctx.emit({ path: aPath, code: 'INVALID_PERSONALIZATION_RULE', message: `invalid action type '${action.type}'`, severity: 'error', meta: { reason: 'invalid_action_type', field: 'type', value: action.type } });
        }
        if (action?.scope !== undefined && !ACTION_SCOPES.has(action.scope)) {
          ctx.emit({ path: aPath, code: 'INVALID_PERSONALIZATION_RULE', message: `invalid action scope '${action.scope}'`, severity: 'error', meta: { reason: 'invalid_action_scope', field: 'scope', value: action.scope } });
        }
      });
    }
  },
};
