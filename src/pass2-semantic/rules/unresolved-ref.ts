import type { SemanticRule } from '../walker.js';
import type { Catalog } from '../../types.js';

const REF_KINDS: Array<{ field: string; kind: string; catalogKey: keyof Catalog }> = [
  { field: 'exercise_ref', kind: 'exercise', catalogKey: 'exercises' },
  { field: 'meal_ref', kind: 'meal', catalogKey: 'meals' },
  { field: 'meditation_ref', kind: 'meditation', catalogKey: 'meditations' },
];

// Catalog sets are matched case-insensitively: LLM emitters routinely vary
// casing ("Push_Up" vs "push_up") and a casing miss must not read as
// "exercise does not exist".
function hasRef(set: ReadonlySet<string> | undefined, ref: string): boolean {
  if (!set) return false;
  if (set.has(ref)) return true;
  const lower = ref.toLowerCase();
  for (const entry of set) {
    if (entry.toLowerCase() === lower) return true;
  }
  return false;
}

export const unresolvedRef: SemanticRule = {
  code: 'UNRESOLVED_REF',
  enterActivity(ctx, activity, path) {
    const catalog = ctx.options.catalog;
    const requireCatalog = ctx.options.requireCatalog;

    for (const { field, kind, catalogKey } of REF_KINDS) {
      const refValue = activity[field];
      if (refValue === undefined) continue;
      if (typeof refValue !== 'string') continue;

      if (!catalog) {
        // No catalog supplied — fail-open by default; fail-closed in strict mode.
        if (requireCatalog) {
          ctx.emit({
            path: `${path}/${field}`,
            code: 'CATALOG_REQUIRED',
            message: `catalog is required in strict mode but was not provided; cannot resolve ${kind} '${refValue}'`,
            severity: 'error',
            meta: { ref_kind: kind, ref_value: refValue },
          });
        }
        continue;
      }

      if (!hasRef(catalog[catalogKey], refValue)) {
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
