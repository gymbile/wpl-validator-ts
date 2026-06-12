import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforce } from '../src/enforce/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, '..', 'conformance', 'enforcement');

function collectActivityNames(plan: Record<string, unknown>): string[] {
  const names: string[] = [];
  const p = plan['plan'] as Record<string, unknown> | undefined;
  for (const phase of ((p?.['phases'] as any[]) ?? [])) {
    for (const week of (phase.weeks ?? [])) {
      for (const day of (week.days ?? [])) {
        for (const block of (day.blocks ?? [])) {
          for (const act of (block.activities ?? [])) {
            const n = act.exercise_ref ?? act.name;
            if (typeof n === 'string') names.push(n);
          }
        }
      }
    }
  }
  return names;
}

describe('enforcement conformance', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  expect(files.length).toBeGreaterThanOrEqual(5);

  for (const file of files) {
    it(file, () => {
      const fx = JSON.parse(readFileSync(resolve(DIR, file), 'utf8'));
      const result = enforce(fx.plan, fx.context, fx.rules, fx.options ?? {});
      const surviving = collectActivityNames(result.plan);

      for (const ex of fx.expect.stripped_exercises) {
        expect(result.stripped.map((s: any) => s.exercise)).toContain(ex);
        expect(surviving).not.toContain(ex);
      }
      for (const ref of fx.expect.surviving_refs) {
        expect(surviving).toContain(ref);
      }
      expect([...new Set(result.diagnostics.map((d: any) => d.code))].sort())
        .toEqual([...fx.expect.diagnostic_codes].sort());
    });
  }
});
