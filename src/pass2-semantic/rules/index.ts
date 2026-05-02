export { duplicateId } from './duplicate-id.js';
export { emptyPhasesForType } from './empty-phases-for-type.js';
export { invalidPersonalizationRule } from './invalid-personalization-rule.js';
export { invalidPointsRule } from './invalid-points-rule.js';
export { invalidPrescription } from './invalid-prescription.js';
export { phaseDurationMismatch } from './phase-duration-mismatch.js';
export { unresolvedRef } from './unresolved-ref.js';

import { duplicateId } from './duplicate-id.js';
import { emptyPhasesForType } from './empty-phases-for-type.js';
import { invalidPersonalizationRule } from './invalid-personalization-rule.js';
import { invalidPointsRule } from './invalid-points-rule.js';
import { invalidPrescription } from './invalid-prescription.js';
import { phaseDurationMismatch } from './phase-duration-mismatch.js';
import { unresolvedRef } from './unresolved-ref.js';

import type { SemanticRule } from '../walker.js';

export const ALL_RULES: SemanticRule[] = [
  duplicateId,
  emptyPhasesForType,
  invalidPersonalizationRule,
  invalidPointsRule,
  invalidPrescription,
  phaseDurationMismatch,
  unresolvedRef,
];
