import type { SemanticRule } from '../walker.js';
import type { Catalog } from '../../types.js';

const REF_KINDS: Array<{ field: string; kind: string; catalogKey: keyof Catalog }> = [
  { field: 'exercise_ref', kind: 'exercise', catalogKey: 'exercises' },
  { field: 'meal_ref', kind: 'meal', catalogKey: 'meals' },
  { field: 'meditation_ref', kind: 'meditation', catalogKey: 'meditations' },
];

export const unresolvedRef: SemanticRule = {
  code: 'UNRESOLVED_REF',
  enterActivity(ctx, activity, path) {
    const catalog = ctx.options.catalog;
    if (!catalog) return;

    for (const { field, kind, catalogKey } of REF_KINDS) {
      const refValue = activity[field];
      if (refValue === undefined) continue;
      if (typeof refValue !== 'string') continue;

      const catalogSet = catalog[catalogKey];
      const resolved = catalogSet?.has(refValue);
      if (!resolved) {
        ctx.emit({
          path: `${path}/${field}`,
          code: 'UNRESOLVED_REF',
          message: `${kind} '${refValue}' not found in catalog`,
          severity: 'error',
          meta: { ref_kind: kind, ref_value: refValue },
        });
      }
    }
  },
};
