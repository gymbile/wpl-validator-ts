import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validate, type ValidationError } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const conformanceDir = resolve(__dirname, '../conformance');

function loadJson(p: string): any {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function matchExpected(
  actual: ValidationError[],
  expected: any[],
): { ok: boolean; reason?: string } {
  for (const exp of expected) {
    const found = actual.find((a) => a.code === exp.code && a.path === exp.path);
    if (!found) {
      return { ok: false, reason: `Missing expected error: code=${exp.code} path=${exp.path}` };
    }
    if (exp.severity && found.severity !== exp.severity) {
      return {
        ok: false,
        reason: `Severity mismatch on ${exp.code} ${exp.path}: expected ${exp.severity}, got ${found.severity}`,
      };
    }
    if (exp.meta) {
      for (const [k, v] of Object.entries(exp.meta)) {
        if (JSON.stringify(found.meta?.[k]) !== JSON.stringify(v)) {
          return {
            ok: false,
            reason: `Meta mismatch on ${exp.code} ${exp.path} key=${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(found.meta?.[k])}`,
          };
        }
      }
    }
  }
  // Extra errors fail the test — but allow extra SCHEMA_VIOLATION cascades when
  // the expected set already contains a SCHEMA_VIOLATION (ajv often emits
  // multiple correlated keyword errors for a single underlying problem).
  const expectsSchemaViolation = expected.some((e) => e.code === 'SCHEMA_VIOLATION');
  const extras = actual.filter(
    (a) => !expected.some((e) => e.code === a.code && e.path === a.path),
  );
  const disallowedExtras = expectsSchemaViolation
    ? extras.filter((a) => a.code !== 'SCHEMA_VIOLATION')
    : extras;
  if (disallowedExtras.length > 0) {
    return {
      ok: false,
      reason: `Got ${actual.length} errors, expected ${expected.length}. Disallowed extras: ${JSON.stringify(disallowedExtras)}`,
    };
  }
  return { ok: true };
}

describe('Conformance suite', () => {
  const validFiles = readdirSync(resolve(conformanceDir, 'valid')).filter((f) =>
    f.endsWith('.json'),
  );
  for (const file of validFiles) {
    it(`valid/${file}: validates with no errors`, () => {
      const plan = loadJson(resolve(conformanceDir, 'valid', file));
      const result = validate(plan);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }

  const invalidFiles = readdirSync(resolve(conformanceDir, 'invalid')).filter(
    (f) =>
      f.endsWith('.json') && !f.endsWith('.expected.json') && !f.endsWith('.catalog.json'),
  );
  for (const file of invalidFiles) {
    const base = file.replace(/\.json$/, '');
    it(`invalid/${file}: emits expected errors`, () => {
      const plan = loadJson(resolve(conformanceDir, 'invalid', file));
      const expected = loadJson(resolve(conformanceDir, 'invalid', `${base}.expected.json`));

      // Optional catalog
      let options = {};
      const catalogPath = resolve(conformanceDir, 'invalid', `${base}.catalog.json`);
      if (existsSync(catalogPath)) {
        const catalog = loadJson(catalogPath);
        const c: any = {};
        if (catalog.exercises) c.exercises = new Set(catalog.exercises);
        if (catalog.meals) c.meals = new Set(catalog.meals);
        if (catalog.meditations) c.meditations = new Set(catalog.meditations);
        options = { catalog: c };
      }

      const result = validate(plan, options);
      const m = matchExpected(result.errors, expected);
      if (!m.ok) {
        console.error('Actual errors:', JSON.stringify(result.errors, null, 2));
        console.error('Expected errors:', JSON.stringify(expected, null, 2));
      }
      expect(m.ok, m.reason).toBe(true);
    });
  }
});
