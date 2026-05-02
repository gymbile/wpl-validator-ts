import type { SemanticRule } from '../walker.js';

export const phaseDurationMismatch: SemanticRule = {
  code: 'PHASE_DURATION_MISMATCH',
  enterPhase(ctx, phase, path) {
    const dur = phase?.duration;
    const weeks = Array.isArray(phase?.weeks) ? phase.weeks : [];
    if (!dur || typeof dur !== 'object' || weeks.length === 0) return;

    const value = dur.value;
    const unit = dur.unit;
    if (typeof value !== 'number' || typeof unit !== 'string') return;

    let mismatch = false;
    if (unit === 'weeks' && value !== weeks.length) {
      mismatch = true;
    } else if (unit === 'days') {
      const expectedWeeks = Math.floor(value / 7);
      if (expectedWeeks > 0 && Math.abs(expectedWeeks - weeks.length) > 1) {
        mismatch = true;
      }
    }

    if (mismatch) {
      ctx.emit({
        path,
        code: 'PHASE_DURATION_MISMATCH',
        message: `Phase duration (${value} ${unit}) does not match weeks array (${weeks.length} items)`,
        severity: 'warning',
        meta: { declared_value: value, declared_unit: unit, weeks_count: weeks.length },
      });
    }
  },
};
