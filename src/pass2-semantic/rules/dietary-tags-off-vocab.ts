import type { SemanticRule } from '../walker.js';
import { DIETARY_TAGS } from '../../data/dietary-tags.generated.js';

const KNOWN = new Set<string>(DIETARY_TAGS);

export const dietaryTagsOffVocab: SemanticRule = {
  code: 'DIETARY_TAGS_OFF_VOCAB',
  enterActivity(ctx, activity, path) {
    if (activity.type !== 'nutrition') return;
    const tags = (activity as Record<string, unknown>).dietary_tags;
    if (!Array.isArray(tags) || tags.length === 0) return;
    tags.forEach((tag: unknown) => {
      if (typeof tag !== 'string' || KNOWN.has(tag)) return;
      ctx.emit({
        path,
        code: 'DIETARY_TAGS_OFF_VOCAB',
        message: `Dietary tag "${tag}" is not in the recommended vocabulary (see data/dietary-tags.json).`,
        severity: 'warning',
        meta: { tag },
      });
    });
  },
};
