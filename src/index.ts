import { runPass1 } from './pass1-schema.js';
import { runPass2 } from './pass2-semantic/index.js';
import { ALL_RULES } from './pass2-semantic/rules/index.js';
import type {
  ValidationResult,
  ValidationOptions,
  ErrorCode,
  RepairHint,
} from './types.js';

export function validate(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const pass1Errors = runPass1(input);
  if (pass1Errors.length > 0) {
    return { valid: false, errors: pass1Errors };
  }

  const pass2Errors = runPass2(input, { ...options, rules: ALL_RULES });
  const valid = pass2Errors.every((e) => e.severity !== 'error');
  return { valid, errors: pass2Errors };
}

export type {
  ValidationResult,
  ValidationError,
  ValidationOptions,
  Catalog,
  ErrorCode,
  Severity,
  RepairHint,
} from './types.js';

/**
 * Convenience: pull every actionable `repair_hint` out of a ValidationResult.
 *
 * Designed for agentic completion loops — the orchestrator gets a flat
 * array of repair actions without having to inspect each error's optional
 * field. Errors without a hint (e.g. CYCLIC_SUBPLAN) are skipped.
 */
export function getRepairHints(result: ValidationResult): Array<{
  code: ErrorCode;
  path: string;
  hint: RepairHint;
}> {
  const out: Array<{ code: ErrorCode; path: string; hint: RepairHint }> = [];
  for (const e of result.errors) {
    if (e.repair_hint) out.push({ code: e.code, path: e.path, hint: e.repair_hint });
  }
  return out;
}
