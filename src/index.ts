import { runPass1 } from './pass1-schema.js';
import type { ValidationResult, ValidationOptions } from './types.js';

export function validate(input: unknown, _options: ValidationOptions = {}): ValidationResult {
  const pass1Errors = runPass1(input);
  if (pass1Errors.length > 0) {
    return { valid: false, errors: pass1Errors };
  }

  // Pass 2 wired in Phase C; for now, valid means Pass 1 passed.
  return { valid: true, errors: [] };
}

export type {
  ValidationResult,
  ValidationError,
  ValidationOptions,
  Catalog,
  ErrorCode,
  Severity,
} from './types.js';
