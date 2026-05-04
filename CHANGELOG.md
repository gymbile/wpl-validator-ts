# Changelog

All notable changes to `@gymbile/wpl-validator`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] — 2026-05-04

### Changed
- Sync vendored schema + conformance suite from `gymbile/wpl@v1.6.0` (was `v1.5.0`).

### Added (schema)
- **Contraindication tightening.** Optional `severity` (`low | moderate | high`) and new `action: "require_clearance"`.
- **Cardio interval consistency.** `intervals.work.duration` / `.rest.duration` accept a full `Duration` object (bare number retained for back-compat).
- **Cardio intensity slots.** `intensity.target` documents typed slots (`zone`, `min_bpm`/`max_bpm`, `min_watts`/`max_watts`, `value`+`unit` for pace).
- **Resistance extras.** `Reps.amrap: bool`, `ExercisePrescription.to_failure: bool`, `Weight.metric` enum (`1RM | e1RM | training_max | daily_max`).
- **Typed progress measurements.** `Checkpoint.measurements[]` items accept a `MeasurementSpec` with `MeasurementMetric` + `Questionnaire` enums.
- **Recovery typing.** `RecoveryExercise` gains `modality`, `intensity_rpe`, structured `pnf` block, `body_part`.
- 5 new valid conformance fixtures: `contraindication-clearance`, `cardio-intervals-duration`, `amrap-to-failure`, `checkpoint-typed-measurements`, `recovery-pnf-smr`.
- 5 new invalid conformance fixture pairs: `contraindication-bad-severity`, `contraindication-bad-action`, `checkpoint-bad-metric`, `recovery-bad-modality`, `weight-bad-metric`.

### Notes
All changes are additive; every plan that validated under 1.5.0 continues to validate under 1.6.0.

## [1.4.0] — 2026-05-03

### Added
- Pass-2 rule `CYCLIC_SUBPLAN`. Detects sub-plan reference self-cycles (a `SubPlanActivity` whose `sub_plan_ref` equals the containing plan's `id`). Cross-plan cycles deferred pending a `sub_plans` resolution map in the validate API.
- `'CYCLIC_SUBPLAN'` added to the public `ErrorCode` union (was previously dropped in 1.0.2 after sitting unused).

### Changed
- Sync vendored schema + conformance suite from `gymbile/wpl@v1.5.0` (was `v1.4.0`).

### Notes
89/89 tests pass.

## [1.3.0] — 2026-05-03

### Changed
- Sync vendored schema + conformance suite from `gymbile/wpl@v1.4.0` (was `v1.3.0`).

### Notes
Schema v1.4.0 adds per-bodyweight scaling for macros (`unit: g_per_kg`), calories (`unit: kcal_per_kg | multiplier_of_tdee`), and load (`type: percentage_bodyweight`); plus documented controlled-vocabulary prefixes for `PersonalizationInput.source` (user.*/wellness.*/device.*/plan.*) and `Contraindication.condition` (icd10:/snomed:/acsm:/acog:). All additive.

## [1.2.0] — 2026-05-03

### Changed
- Sync vendored schema + conformance suite from `gymbile/wpl@v1.3.0` (was `v1.2.0`).

### Notes
Schema v1.3.0 adds optional `primary_muscles`/`secondary_muscles`/`movement_pattern` on `ExerciseActivity`, plan-level `athlete_thresholds`, and `intensity.zone_model` on cardio. Pure schema-driven validation; no new TS-side rules. ajv's native `oneOf` behavior already matches the conformance contract for nested-enum failures inside `Activity` branches. 84/84 tests pass.

## [1.1.0] — 2026-05-03

### Changed
- Sync vendored schema + conformance suite from `gymbile/wpl@v1.2.0` (was `v1.1.1`).

### Notes
Schema v1.2.0 is purely additive: `Phase.type` enum, `Week.is_deload` boolean, and a structured `Tempo` shape (alongside the existing string form). No new validator rules; schema validation alone covers all three additions. Plans authored against v1.1.x continue to validate unchanged.

## [1.0.2] — 2026-05-02

### Fixed
- `INVALID_PERSONALIZATION_RULE` now recurses into nested CompoundConditions; previously only the top-level condition shape was validated, so nested compounds with invalid inner operators or malformed leaves were silently accepted.

### Changed
- Internal `walker.ts` and rule signatures now use structural interfaces instead of `any` — better IDE help, easier rule authoring, no public API change.
- Tarball size reduced ~3.6× by no longer shipping sourcemaps.
- Sync vendored schema + conformance suite from `gymbile/wpl@v1.1.1` (was `v1.1.0`).
- Removed `CYCLIC_SUBPLAN` from the public `ErrorCode` union — it was declared but never emitted (deferred upstream pending sub-plan reference shape). Will return when both spec and rule exist.
- Drop redundant `prepare: tsup` script; rely on `prepublishOnly` for publish builds.
- Tighten `engines.node` to `>=20.10` (matches actual floor for source-level JSON import attributes).
- Add `sideEffects: false` for better tree-shaking in consumer bundlers.

### Docs
- Expanded README: `ValidationError` shape, severity semantics, error-code reference, pipeline section, contributing pointer.
- New `CONTRIBUTING.md` with dev setup, rule-addition recipe, and drift-check policy.

### CI
- `drift-check.yml` find precedence fix; resolve latest upstream tag via `git ls-remote` instead of the GitHub Releases API.

## [1.0.1] — 2026-05-02

### Fixed
- `INVALID_PERSONALIZATION_RULE` no longer falsely flags valid CompoundCondition shapes (`{ operator: "and"|"or", conditions: [...] }`). Previously the rule only recognized SimpleCondition (`{ field, op, value }`), so any compound condition was incorrectly reported as `invalid_condition`.

## [1.0.0] — 2026-05-02

### Added
- Initial release of `@gymbile/wpl-validator`.
- Pass 1: JSON Schema validation (Draft 2020-12) using `ajv` with `instancePath`-based RFC 6901 paths.
- Pass 2: semantic invariants — single AST traversal with visitor-pattern rules. Rules: `DUPLICATE_ID` (5 scopes), `EMPTY_PHASES_FOR_TYPE`, `INVALID_PRESCRIPTION`, `INVALID_PERSONALIZATION_RULE`, `INVALID_POINTS_RULE`, `PHASE_DURATION_MISMATCH` (warning), `UNRESOLVED_REF` (catalog-optional).
- Public API: `validate(input, options?)` returns a `ValidationResult` with structured `ValidationError[]` (path, code, severity, meta).
- Conformance suite vendored from [`gymbile/wpl@v1.1.1`](https://github.com/gymbile/wpl/tree/v1.1.1/conformance) — all 3 valid + 9 invalid fixtures pass.
- Drift-check CI (weekly) against `gymbile/wpl` upstream.
- Dual ESM/CJS builds via `tsup`.
