import type { ValidationError, ValidationOptions } from '../types.js';

export interface WalkContext {
  options: ValidationOptions;
  emit: (err: ValidationError) => void;
  scope: Map<string, unknown>;
}

// Structural shape hints for visitor parameters. These are intentionally
// loose (`unknown` for anything we read at runtime) — rules narrow via
// typeof / Array.isArray checks before use.
export interface WalkPlan {
  id?: unknown;
  type?: unknown;
  phases?: unknown;
  personalization?: { rules?: unknown } | null;
  progress?: {
    checkpoints?: unknown;
    points_system?: { rules?: unknown } | null;
  } | null;
}

export interface WalkPhase {
  id?: unknown;
  weeks?: unknown;
  duration?: { value?: unknown; unit?: unknown } | null;
}

export interface WalkWeek {
  id?: unknown;
  days?: unknown;
}

export interface WalkDay {
  id?: unknown;
  blocks?: unknown;
}

export interface WalkBlock {
  id?: unknown;
  type?: unknown;
  activities?: unknown;
}

export interface WalkActivity {
  id?: unknown;
  type?: unknown;
  prescription?: unknown;
  // Catalog refs are read by index lookup, not statically known
  [key: string]: unknown;
}

export interface WalkPersonalizationRule {
  id?: unknown;
  condition?: unknown;
  actions?: unknown;
}

export interface WalkCheckpoint {
  id?: unknown;
  [key: string]: unknown;
}

export interface WalkPointsRule {
  action?: unknown;
  points?: unknown;
}

export interface SemanticRule {
  code: string;
  enterPlan?: (ctx: WalkContext, plan: WalkPlan) => void;
  enterPhase?: (ctx: WalkContext, phase: WalkPhase, path: string) => void;
  enterWeek?: (ctx: WalkContext, week: WalkWeek, path: string) => void;
  enterDay?: (ctx: WalkContext, day: WalkDay, path: string) => void;
  enterBlock?: (ctx: WalkContext, block: WalkBlock, path: string) => void;
  enterActivity?: (ctx: WalkContext, activity: WalkActivity, path: string) => void;
  enterRule?: (ctx: WalkContext, rule: WalkPersonalizationRule, path: string) => void;
  enterCheckpoint?: (ctx: WalkContext, cp: WalkCheckpoint, path: string) => void;
  enterPointsRule?: (ctx: WalkContext, r: WalkPointsRule, path: string) => void;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function walk(input: unknown, ctx: WalkContext, rules: SemanticRule[]): void {
  if (!isObject(input)) return;
  const planRaw = (input as { plan?: unknown }).plan;
  if (!isObject(planRaw)) return;
  const plan = planRaw as WalkPlan;

  for (const r of rules) r.enterPlan?.(ctx, plan);

  const phases = Array.isArray(plan.phases) ? plan.phases : [];
  phases.forEach((phaseRaw: unknown, pi: number) => {
    if (!isObject(phaseRaw)) return;
    const phase = phaseRaw as WalkPhase;
    const phasePath = `/plan/phases/${pi}`;
    ctx.scope.set('cur:phase', (phase as { id?: unknown }).id);
    for (const r of rules) r.enterPhase?.(ctx, phase, phasePath);

    const weeks = Array.isArray(phase.weeks) ? phase.weeks : [];
    weeks.forEach((weekRaw: unknown, wi: number) => {
      if (!isObject(weekRaw)) return;
      const week = weekRaw as WalkWeek;
      const weekPath = `${phasePath}/weeks/${wi}`;
      ctx.scope.set('cur:week', week.id);
      for (const r of rules) r.enterWeek?.(ctx, week, weekPath);

      const days = Array.isArray(week.days) ? week.days : [];
      days.forEach((dayRaw: unknown, di: number) => {
        if (!isObject(dayRaw)) return;
        const day = dayRaw as WalkDay;
        const dayPath = `${weekPath}/days/${di}`;
        ctx.scope.set('cur:day', day.id);
        for (const r of rules) r.enterDay?.(ctx, day, dayPath);

        const blocks = Array.isArray(day.blocks) ? day.blocks : [];
        blocks.forEach((blockRaw: unknown, bi: number) => {
          if (!isObject(blockRaw)) return;
          const block = blockRaw as WalkBlock;
          const blockPath = `${dayPath}/blocks/${bi}`;
          for (const r of rules) r.enterBlock?.(ctx, block, blockPath);

          const acts = Array.isArray(block.activities) ? block.activities : [];
          acts.forEach((actRaw: unknown, ai: number) => {
            if (!isObject(actRaw)) return;
            const act = actRaw as WalkActivity;
            const actPath = `${blockPath}/activities/${ai}`;
            for (const r of rules) r.enterActivity?.(ctx, act, actPath);
          });
        });
      });
    });
  });

  // Personalization rules
  const persRules = Array.isArray(plan.personalization?.rules) ? plan.personalization!.rules : [];
  persRules.forEach((ruleRaw: unknown, ri: number) => {
    if (!isObject(ruleRaw)) return;
    const rule = ruleRaw as WalkPersonalizationRule;
    const rPath = `/plan/personalization/rules/${ri}`;
    for (const r of rules) r.enterRule?.(ctx, rule, rPath);
  });

  // Progress checkpoints + points rules
  const checkpoints = Array.isArray(plan.progress?.checkpoints) ? plan.progress!.checkpoints : [];
  checkpoints.forEach((cpRaw: unknown, ci: number) => {
    if (!isObject(cpRaw)) return;
    const cp = cpRaw as WalkCheckpoint;
    const cpPath = `/plan/progress/checkpoints/${ci}`;
    for (const r of rules) r.enterCheckpoint?.(ctx, cp, cpPath);
  });

  const pointsRules = Array.isArray(plan.progress?.points_system?.rules)
    ? plan.progress!.points_system!.rules
    : [];
  pointsRules.forEach((prRaw: unknown, pri: number) => {
    if (!isObject(prRaw)) return;
    const pr = prRaw as WalkPointsRule;
    const prPath = `/plan/progress/points_system/rules/${pri}`;
    for (const r of rules) r.enterPointsRule?.(ctx, pr, prPath);
  });
}
