import { runPass1 } from './pass1-schema.js';
import { runPass2 } from './pass2-semantic/index.js';
import { ALL_RULES } from './pass2-semantic/rules/index.js';
import type { ValidationResult, ValidationOptions } from './types.js';

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
} from './types.js';
