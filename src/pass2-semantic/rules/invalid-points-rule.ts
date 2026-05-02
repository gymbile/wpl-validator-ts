import type { SemanticRule } from '../walker.js';

export const invalidPointsRule: SemanticRule = {
  code: 'INVALID_POINTS_RULE',
  enterPointsRule(ctx, rule, path) {
    if (rule?.action === undefined) {
      ctx.emit({ path, code: 'INVALID_POINTS_RULE', message: "points rule missing 'action'", severity: 'error', meta: { reason: 'missing_action' } });
    }
    if (rule?.points === undefined) {
      ctx.emit({ path, code: 'INVALID_POINTS_RULE', message: "points rule missing 'points'", severity: 'error', meta: { reason: 'missing_points' } });
      return;
    }
    if (!Number.isInteger(rule.points) || rule.points < 0) {
      ctx.emit({ path, code: 'INVALID_POINTS_RULE', message: "points must be non-negative integer", severity: 'error', meta: { reason: 'points_must_be_non_negative_integer' } });
    }
  },
};
