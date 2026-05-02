import type { ValidationError, ValidationOptions } from '../types.js';
import { walk, type SemanticRule, type WalkContext } from './walker.js';

export interface RunPass2Options extends ValidationOptions {
  rules: SemanticRule[];
}

export function runPass2(input: unknown, opts: RunPass2Options): ValidationError[] {
  const errors: ValidationError[] = [];
  const options: ValidationOptions = {};
  if (opts.catalog !== undefined) options.catalog = opts.catalog;
  const ctx: WalkContext = {
    options,
    emit: (err) => errors.push(err),
    scope: new Map(),
  };
  walk(input, ctx, opts.rules);
  return errors;
}

export type { SemanticRule, WalkContext } from './walker.js';
