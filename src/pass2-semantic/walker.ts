import type { ValidationError, ValidationOptions } from '../types.js';

export interface WalkContext {
  options: ValidationOptions;
  emit: (err: ValidationError) => void;
  scope: Map<string, unknown>;
}

export interface SemanticRule {
  code: string;
  enterPlan?: (ctx: WalkContext, plan: any) => void;
  enterPhase?: (ctx: WalkContext, phase: any, path: string) => void;
  enterWeek?: (ctx: WalkContext, week: any, path: string) => void;
  enterDay?: (ctx: WalkContext, day: any, path: string) => void;
  enterBlock?: (ctx: WalkContext, block: any, path: string) => void;
  enterActivity?: (ctx: WalkContext, activity: any, path: string) => void;
  enterRule?: (ctx: WalkContext, rule: any, path: string) => void;
  enterCheckpoint?: (ctx: WalkContext, cp: any, path: string) => void;
  enterPointsRule?: (ctx: WalkContext, r: any, path: string) => void;
}

export function walk(input: any, ctx: WalkContext, rules: SemanticRule[]): void {
  const plan = input?.plan;
  if (!plan || typeof plan !== 'object') return;

  for (const r of rules) r.enterPlan?.(ctx, plan);

  const phases = Array.isArray(plan.phases) ? plan.phases : [];
  phases.forEach((phase: any, pi: number) => {
    const phasePath = `/plan/phases/${pi}`;
    for (const r of rules) r.enterPhase?.(ctx, phase, phasePath);

    const weeks = Array.isArray(phase.weeks) ? phase.weeks : [];
    weeks.forEach((week: any, wi: number) => {
      const weekPath = `${phasePath}/weeks/${wi}`;
      for (const r of rules) r.enterWeek?.(ctx, week, weekPath);

      const days = Array.isArray(week.days) ? week.days : [];
      days.forEach((day: any, di: number) => {
        const dayPath = `${weekPath}/days/${di}`;
        for (const r of rules) r.enterDay?.(ctx, day, dayPath);

        const blocks = Array.isArray(day.blocks) ? day.blocks : [];
        blocks.forEach((block: any, bi: number) => {
          const blockPath = `${dayPath}/blocks/${bi}`;
          for (const r of rules) r.enterBlock?.(ctx, block, blockPath);

          const acts = Array.isArray(block.activities) ? block.activities : [];
          acts.forEach((act: any, ai: number) => {
            const actPath = `${blockPath}/activities/${ai}`;
            for (const r of rules) r.enterActivity?.(ctx, act, actPath);
          });
        });
      });
    });
  });

  // Personalization rules
  const persRules = Array.isArray(plan.personalization?.rules) ? plan.personalization.rules : [];
  persRules.forEach((rule: any, ri: number) => {
    const rPath = `/plan/personalization/rules/${ri}`;
    for (const r of rules) r.enterRule?.(ctx, rule, rPath);
  });

  // Progress checkpoints + points rules
  const checkpoints = Array.isArray(plan.progress?.checkpoints) ? plan.progress.checkpoints : [];
  checkpoints.forEach((cp: any, ci: number) => {
    const cpPath = `/plan/progress/checkpoints/${ci}`;
    for (const r of rules) r.enterCheckpoint?.(ctx, cp, cpPath);
  });

  const pointsRules = Array.isArray(plan.progress?.points_system?.rules)
    ? plan.progress.points_system.rules
    : [];
  pointsRules.forEach((pr: any, pri: number) => {
    const prPath = `/plan/progress/points_system/rules/${pri}`;
    for (const r of rules) r.enterPointsRule?.(ctx, pr, prPath);
  });
}
