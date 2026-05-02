import type { SemanticRule, WalkContext } from '../walker.js';

interface SeenMap {
  // id -> first JSON pointer
  seen: Map<string, string>;
}

function getSeen(ctx: WalkContext, key: string): SeenMap {
  if (!ctx.scope.has(key)) ctx.scope.set(key, { seen: new Map<string, string>() });
  return ctx.scope.get(key) as SeenMap;
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
    check(ctx, 'dup:plan', 'plan', phase?.id, path);
  },

  enterWeek(ctx, week, path) {
    const phaseId = parsePhaseIdFromPath(ctx, path);
    check(ctx, `dup:phase:${phaseId}`, `phase:${phaseId}`, week?.id, path);
  },

  enterDay(ctx, day, path) {
    const weekId = parseWeekIdFromPath(ctx, path);
    check(ctx, `dup:week:${weekId}`, `week:${weekId}`, day?.id, path);
  },

  enterBlock(ctx, block, path) {
    const dayId = parseDayIdFromPath(ctx, path);
    check(ctx, `dup:day-block:${dayId}`, `day:${dayId}`, block?.id, path);
  },

  enterActivity(ctx, activity, path) {
    const dayId = parseDayIdFromPath(ctx, path);
    check(ctx, `dup:day-act:${dayId}`, `day:${dayId}`, activity?.id, path);
  },
};

// Helpers: extract parent IDs from ctx scope.
// Walker tracks currentPhase/currentWeek/currentDay in scope as it descends.
function parsePhaseIdFromPath(ctx: WalkContext, _path: string): string {
  return (ctx.scope.get('cur:phase') as string) ?? '';
}
function parseWeekIdFromPath(ctx: WalkContext, _path: string): string {
  return (ctx.scope.get('cur:week') as string) ?? '';
}
function parseDayIdFromPath(ctx: WalkContext, _path: string): string {
  return (ctx.scope.get('cur:day') as string) ?? '';
}
