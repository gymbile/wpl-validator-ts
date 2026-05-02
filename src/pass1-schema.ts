import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../schema/v1.schema.json' with { type: 'json' };
import type { ValidationError } from './types.js';

let validateFn: ReturnType<Ajv2020['compile']> | null = null;

function getValidateFn(): ReturnType<Ajv2020['compile']> {
  if (!validateFn) {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      validateFormats: false,
    });
    validateFn = ajv.compile(schema);
  }
  return validateFn;
}

export function runPass1(input: unknown): ValidationError[] {
  const fn = getValidateFn();
  const ok = fn(input);
  if (ok) return [];

  const errors: ValidationError[] = [];
  for (const err of fn.errors ?? []) {
    errors.push({
      path: err.instancePath || '',
      code: 'SCHEMA_VIOLATION',
      message: err.message ?? 'schema violation',
      severity: 'error',
      meta: {
        keyword: err.keyword,
        params: err.params,
      },
    });
  }
  return errors;
}
