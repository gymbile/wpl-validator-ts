import type { SemanticRule } from '../walker.js';
import type { RepairHint } from '../../types.js';

const VALID_TYPES = ['sets_reps', 'time', 'distance', 'amrap', 'continuous', 'intervals'] as const;
const VALID_TYPES_SET = new Set<string>(VALID_TYPES);

// Per prescription type, the minimum required-field signature. Used to
// shape the repair_hint.expected_shape so an agent can re-emit a valid
// prescription block from scratch.
const SHAPE_BY_TYPE: Record<string, string> = {
  sets_reps: '{ type: "sets_reps", sets: <number>, reps: <number | { min, max }> }',
  time: '{ type: "time", duration: { value: <number>, unit: "seconds" | "minutes" } }',
  distance: '{ type: "distance", distance: { value: <number>, unit: "meters" | "kilometers" | "miles" } }',
  amrap: '{ type: "amrap", duration: { value: <number>, unit: "minutes" } }',
  continuous: '{ type: "continuous", duration: { value: <number>, unit: "minutes" } }',
  intervals: '{ type: "intervals", rounds: <number>, work: { ... }, rest: { ... } }',
};

export const invalidPrescription: SemanticRule = {
  code: 'INVALID_PRESCRIPTION',
  enterActivity(ctx, activity, path) {
    if (activity.type !== 'exercise') return;
    const pRaw = activity.prescription;
    if (typeof pRaw !== 'object' || pRaw === null) return;
    const p = pRaw as { type?: unknown; sets?: unknown; reps?: unknown; duration?: unknown };

    const presPath = `${path}/prescription`;
    const activityName = typeof activity.name === 'string' ? activity.name : undefined;
    const t = p.type;

    if (t === undefined) {
      const repair_hint: RepairHint = {
        action: 'fix_prescription',
        target_path: presPath,
        ...(activityName ? { parent_name: activityName } : {}),
        allowed_values: [...VALID_TYPES],
        expected_shape: 'prescription.type is required; pick one of the allowed values and provide its required fields',
      };
      ctx.emit({
        path: presPath,
        code: 'INVALID_PRESCRIPTION',
        message: "prescription missing 'type'",
        severity: 'error',
        meta: { reason: 'missing_type' },
        repair_hint,
      });
      return;
    }

    if (typeof t !== 'string' || !VALID_TYPES_SET.has(t)) {
      const repair_hint: RepairHint = {
        action: 'fix_prescription',
        target_path: presPath,
        ...(activityName ? { parent_name: activityName } : {}),
        allowed_values: [...VALID_TYPES],
        expected_shape: 'prescription.type must be one of the allowed values',
      };
      ctx.emit({
        path: presPath,
        code: 'INVALID_PRESCRIPTION',
        message: `unknown prescription type '${String(t)}'`,
        severity: 'error',
        meta: { reason: 'unknown_type', prescription_type: t },
        repair_hint,
      });
      return;
    }

    if (t === 'sets_reps' && p.sets === undefined && p.reps === undefined) {
      const repair_hint: RepairHint = {
        action: 'fix_prescription',
        target_path: presPath,
        ...(activityName ? { parent_name: activityName } : {}),
        missing: ['sets', 'reps'],
        expected_shape: SHAPE_BY_TYPE['sets_reps']!,
      };
      ctx.emit({
        path: presPath,
        code: 'INVALID_PRESCRIPTION',
        message: "sets_reps prescription requires 'sets' or 'reps'",
        severity: 'error',
        meta: { reason: 'sets_reps_requires_sets_or_reps' },
        repair_hint,
      });
    }

    if (t === 'time' && p.duration === undefined) {
      const repair_hint: RepairHint = {
        action: 'fix_prescription',
        target_path: presPath,
        ...(activityName ? { parent_name: activityName } : {}),
        missing: ['duration'],
        expected_shape: SHAPE_BY_TYPE['time']!,
      };
      ctx.emit({
        path: presPath,
        code: 'INVALID_PRESCRIPTION',
        message: "time prescription requires 'duration'",
        severity: 'error',
        meta: { reason: 'time_requires_duration' },
        repair_hint,
      });
    }
  },
};
