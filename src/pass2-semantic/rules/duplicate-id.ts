import type { SemanticRule, WalkContext } from '../walker.js';

interface SeenMap {
  // id -> first JSON pointer
  seen: Map<string, string>;
}

function getSeen(ctx: WalkContext, key: string): SeenMap {
  if (!ctx.scope.has(key)) ctx.scope.set(key, { seen: new Map<string, string>() });
  return ctx.scope.get(key) as SeenMap;
}

function getScopeId(ctx: WalkContext, key: string): string {
  const v = ctx.scope.get(key);
  return typeof v === 'string' ? v : '';
}

function check(
  ctx: WalkContext,
  scopeKey: string,
  scopeLabel: string,
  id: unknown,
  path: string,
): void {
  if (typeof id !== 'string' || !id) return;
  const m = getSeen(ctx, scopeKey);
  const first = m.seen.get(id);
  if (first) {
    ctx.emit({
      path,
      code: 'DUPLICATE_ID',
      message: `Duplicate id '${id}' within scope ${scopeLabel}`,
      severity: 'error',
      meta: {
        duplicate_id: id,
        scope: scopeLabel,
        first_occurrence: first,
      },
    });
  } else {
    m.seen.set(id, path);
  }
}

export const duplicateId: SemanticRule = {
  code: 'DUPLICATE_ID',

  enterPlan(ctx) {
    // reset all DUPLICATE_ID scope state at top of plan to keep walker idempotent
    for (const k of [...ctx.scope.keys()]) {
      if (k.startsWith('dup:')) ctx.scope.delete(k);
    }
  },

  enterPhase(ctx, phase, path) {
    check(ctx, 'dup:plan', 'plan', phase.id, path);
  },

  enterWeek(ctx, week, path) {
    const phaseId = getScopeId(ctx, 'cur:phase');
    check(ctx, `dup:phase:${phaseId}`, `phase:${phaseId}`, week.id, path);
  },

  enterDay(ctx, day, path) {
    const weekId = getScopeId(ctx, 'cur:week');
    check(ctx, `dup:week:${weekId}`, `week:${weekId}`, day.id, path);
  },

  enterBlock(ctx, block, path) {
    // Day IDs (`day_1`, `day_2`) are positional within their week and
    // therefore repeat across weeks (week 1 / day 1, week 2 / day 1, ...).
    // Scope block uniqueness to (phase, week, day) so structurally-correct
    // multi-week plans do not falsely report DUPLICATE_ID on identical
    // block IDs like `warmup_block` appearing once per day.
    const phaseId = getScopeId(ctx, 'cur:phase');
    const weekId = getScopeId(ctx, 'cur:week');
    const dayId = getScopeId(ctx, 'cur:day');
    const label = `phase:${phaseId}/week:${weekId}/day:${dayId}`;
    check(ctx, `dup:block:${phaseId}:${weekId}:${dayId}`, label, block.id, path);
  },

  enterActivity(ctx, activity, path) {
    // Same reasoning as enterBlock — activity IDs scoped to (phase, week, day).
    const phaseId = getScopeId(ctx, 'cur:phase');
    const weekId = getScopeId(ctx, 'cur:week');
    const dayId = getScopeId(ctx, 'cur:day');
    const label = `phase:${phaseId}/week:${weekId}/day:${dayId}`;
    check(ctx, `dup:activity:${phaseId}:${weekId}:${dayId}`, label, activity.id, path);
  },
};
