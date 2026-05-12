import type { SemanticRule } from '../walker.js';
import type { RepairHint } from '../../types.js';

/**
 * Allowed activity types per block type.
 * `simple` and `sub_plan` are accepted everywhere as escape hatches.
 */
const ALLOWED: Record<string, ReadonlySet<string>> = {
  warmup: new Set(['exercise', 'cardio', 'recovery', 'simple', 'sub_plan']),
  main: new Set(['exercise', 'cardio', 'nutrition', 'meditation', 'recovery', 'habit', 'simple', 'sub_plan']),
  cooldown: new Set(['exercise', 'cardio', 'recovery', 'meditation', 'simple', 'sub_plan']),
  nutrition: new Set(['nutrition', 'simple', 'sub_plan']),
  meditation: new Set(['meditation', 'simple', 'sub_plan']),
  education: new Set(['simple', 'habit', 'sub_plan']),
  assessment: new Set(['exercise', 'cardio', 'simple', 'sub_plan']),
};

function allowedList(blockType: string): string {
  const s = ALLOWED[blockType];
  return s ? [...s].join(', ') : '(none)';
}

export const activityBlockMismatch: SemanticRule = {
  code: 'ACTIVITY_BLOCK_MISMATCH',

  enterBlock(ctx, block) {
    const blockType = typeof block.type === 'string' ? block.type : null;
    ctx.scope.set('cur:block_type', blockType);
  },

  enterActivity(ctx, activity, path) {
    const blockType = ctx.scope.get('cur:block_type');
    if (typeof blockType !== 'string') return;

    const allowed = ALLOWED[blockType];
    if (!allowed) return; // unknown block type — not our jurisdiction

    const actType = typeof activity.type === 'string' ? activity.type : null;
    if (!actType) return; // no type — schema validator will catch it

    if (!allowed.has(actType)) {
      const allowedArr = [...allowed];
      const activityName =
        typeof activity.name === 'string' ? activity.name : undefined;
      const repair_hint: RepairHint = {
        action: 'fix_activity',
        // The repair attaches to the offending activity itself — the agent
        // either changes its `type` to an allowed value or moves it to a
        // block whose type accepts the current activity type.
        target_path: path,
        ...(activityName ? { parent_name: activityName } : {}),
        allowed_values: allowedArr,
        expected_shape: `activity.type must be one of: ${allowedArr.join(', ')} (block type: ${blockType})`,
      };

      ctx.emit({
        path,
        code: 'ACTIVITY_BLOCK_MISMATCH',
        message: `Activity type '${actType}' not allowed in '${blockType}' block. Allowed: ${allowedList(blockType)}.`,
        severity: 'error',
        meta: {
          activity_type: actType,
          block_type: blockType,
          allowed: allowedArr,
        },
        repair_hint,
      });
    }
  },
};
