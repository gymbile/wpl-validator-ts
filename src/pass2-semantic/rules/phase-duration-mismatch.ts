import type { SemanticRule } from '../walker.js';
import type { RepairHint } from '../../types.js';

const DSL_WEEK_EXAMPLE = `    WEEK {n}:
      DAY Monday training 45m "Session name":
        warmup:
          cycling 5m zone2
        main straight_sets:
          <exercise_name> 3x8..12 rpe 7 rest 90 seconds
        cooldown:
          <stretch_name> 30s`;

function expectedWeeksFromDuration(value: number, unit: string): number | null {
  if (unit === 'weeks') return value;
  if (unit === 'days') return Math.floor(value / 7);
  return null;
}

export const phaseDurationMismatch: SemanticRule = {
  code: 'PHASE_DURATION_MISMATCH',
  enterPhase(ctx, phase, path) {
    const dur = phase.duration;
    const weeks = Array.isArray(phase.weeks) ? phase.weeks : [];
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

    if (!mismatch) return;

    const expectedWeeks = expectedWeeksFromDuration(value, unit);
    const actualCount = weeks.length;
    const phaseName = typeof phase.name === 'string' ? phase.name : undefined;

    // For under-emitted plans (expected > actual) we can list the precise
    // week numbers an agent should regenerate. For over-emitted plans
    // (expected < actual) the repair is "shorten the phase or drop weeks"
    // which is not a generative action — we still emit a hint but with no
    // `missing` list.
    let missingWeekNumbers: number[] | undefined;
    let action: RepairHint['action'] = 'add_weeks';
    if (expectedWeeks !== null && expectedWeeks > actualCount) {
      missingWeekNumbers = [];
      for (let n = actualCount + 1; n <= expectedWeeks; n++) missingWeekNumbers.push(n);
    } else if (expectedWeeks !== null && expectedWeeks < actualCount) {
      // Agent should reconcile by changing duration, not adding content.
      action = 'add_weeks'; // keep action but no missing list
    }

    const repair_hint: RepairHint = {
      action,
      target_path: `${path}/weeks`,
      ...(phaseName ? { parent_name: phaseName } : {}),
      ...(expectedWeeks !== null ? { expected_count: expectedWeeks } : {}),
      actual_count: actualCount,
      ...(missingWeekNumbers && missingWeekNumbers.length > 0
        ? {
            missing: missingWeekNumbers,
            context_dsl_example: DSL_WEEK_EXAMPLE,
          }
        : {}),
    };

    ctx.emit({
      path,
      code: 'PHASE_DURATION_MISMATCH',
      message: `Phase duration (${value} ${unit}) does not match weeks array (${actualCount} items)`,
      severity: 'warning',
      meta: {
        declared_value: value,
        declared_unit: unit,
        weeks_count: actualCount,
        ...(missingWeekNumbers ? { missing_week_numbers: missingWeekNumbers } : {}),
      },
      repair_hint,
    });
  },
};
