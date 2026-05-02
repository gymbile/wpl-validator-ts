import type { SemanticRule } from '../walker.js';

const VALID_TYPES = new Set(['sets_reps', 'time', 'distance', 'amrap', 'continuous', 'intervals']);

export const invalidPrescription: SemanticRule = {
  code: 'INVALID_PRESCRIPTION',
  enterActivity(ctx, activity, path) {
    if (activity.type !== 'exercise') return;
    const pRaw = activity.prescription;
    if (typeof pRaw !== 'object' || pRaw === null) return;
    const p = pRaw as { type?: unknown; sets?: unknown; reps?: unknown; duration?: unknown };

    const presPath = `${path}/prescription`;
    const t = p.type;
    if (t === undefined) {
      ctx.emit({ path: presPath, code: 'INVALID_PRESCRIPTION', message: "prescription missing 'type'", severity: 'error', meta: { reason: 'missing_type' } });
      return;
    }
    if (typeof t !== 'string' || !VALID_TYPES.has(t)) {
      ctx.emit({ path: presPath, code: 'INVALID_PRESCRIPTION', message: `unknown prescription type '${String(t)}'`, severity: 'error', meta: { reason: 'unknown_type', prescription_type: t } });
      return;
    }
    if (t === 'sets_reps' && p.sets === undefined && p.reps === undefined) {
      ctx.emit({ path: presPath, code: 'INVALID_PRESCRIPTION', message: "sets_reps prescription requires 'sets' or 'reps'", severity: 'error', meta: { reason: 'sets_reps_requires_sets_or_reps' } });
    }
    if (t === 'time' && p.duration === undefined) {
      ctx.emit({ path: presPath, code: 'INVALID_PRESCRIPTION', message: "time prescription requires 'duration'", severity: 'error', meta: { reason: 'time_requires_duration' } });
    }
  },
};
