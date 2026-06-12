# Changelog

All notable changes to `@gymbile/wpl-validator`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.8.0] — 2026-06-12

### Fixed
- Matcher now stems compound short plurals (`push_ups` → `push_up`, and the full
  `_ups` family: `pull_ups`, `sit_ups`, `chin_ups`, `press_ups`). This is a
  deliberate divergence from the v0.6 scorer's `stemPlural` ≤3-char exemption,
  which left "ups" (3 chars) unstemmed and caused compound plurals to evade the
  blacklist silently — a fail-open in the safety scorer. The fix is applied
  identically in `wpl-validator-ts/src/enforce/matcher.ts` and
  `wpl-eval/src/scoring/blacklist.ts`; both now differ from the frozen v0.6
  results for `_ups`-family exercises. The canonical short token `abs` is
  explicitly NOT stemmed. Conformance fixture: `forbid-fuzzy-plural.json`.

### Added
- **Pass-3 enforcement engine**: `enforce(plan, context, rules, options)` evaluates
  personalization rules against a `ClientContext` and strips forbidden exercises
  from the compiled plan, with per-activity attribution (`stripped[]`) and
  fail-closed diagnostics (`UNKNOWN_CONDITION_FIELD`, `UNKNOWN_ACTION_TYPE`).
  Ported from the wpl-eval Lane B runtime so the shipped engine matches the
  published v0.6 benchmark. Exports: `enforce`, `evaluateRules`, `firingActions`,
  `collides`, `computeCycleDay` + types.
- Enforcement conformance fixtures (`conformance/enforcement/`) — the
  "contraindicated exercise must not survive" invariant is now a tested contract.
- Strict catalog mode: `validate(plan, { requireCatalog: true })` fails with
  `CATALOG_REQUIRED` instead of silently skipping entity resolution.
- `forbid_exercise` accepted by INVALID_PERSONALIZATION_RULE; `in`/`not_in`
  condition ops; nested compound conditions (schema 1.7.0 sync).

### Changed
- Catalog ref resolution is case-insensitive.
- Vendored schema: 1.7.0.

## [1.7.1] — 2026-05-12

### Added
- `RepairHint` attached to three more high-value rules — `ACTIVITY_BLOCK_MISMATCH`,
  `INVALID_PRESCRIPTION`, and `EMPTY_PHASES_FOR_TYPE` — following the same agentic
  repair pattern introduced in 1.7.0. Each hint carries `action`, `target_path`, and
  rule-specific slots (`missing`, `allowed_values`, `expected_shape`,
  `context_dsl_example`) so orchestrators can construct targeted re-generation
  prompts without parsing free-text messages.

## [1.7.0] — 2026-05-12

### Added
- `RepairHint` interface (new public type): machine-actionable repair guidance
  attached to `ValidationError.repair_hint`. Fields: `action`, `target_path`,
  `parent_name`, `missing`, `expected_count`, `actual_count`, `allowed_values`,
  `expected_shape`, `context_dsl_example`. Designed for agentic completion loops
  that need to construct targeted re-generation prompts without parsing free-text
  messages.
- `PHASE_DURATION_MISMATCH` now populates `repair_hint` with `action: 'add_weeks'`,
  `expected_count`/`actual_count`, `missing` (week numbers to generate), and a
  `context_dsl_example` DSL snippet.
- `getRepairHints(result)` top-level helper: flattens all `repair_hint` fields
  from a `ValidationResult` into a single array — agents call once instead of
  inspecting every error's optional field.

## [1.6.7] — 2026-05-12

### Fixed
- `DUPLICATE_ID` for blocks and activities now scopes uniqueness to
  `(phase, week, day)` instead of just `day`. Day IDs such as `day_1` are
  positional within a week and repeat across weeks by design; the previous
  scope (`day:<dayId>`) caused a flood of false-positive `DUPLICATE_ID` errors
  on every multi-week plan — a 12-week programme with a daily `warmup_block`
  produced ~30+ spurious findings. The new scope key is
  `phase:<phaseId>/week:<weekId>/day:<dayId>`. Within-day duplicates are still
  flagged correctly.

## [1.6.6] — 2026-05-05

### Changed

- **ACTIVITY_BLOCK_MISMATCH allowed-activity table relaxed for warmup and cooldown** — `exercise` is now allowed in both `warmup` and `cooldown` blocks. Real plans routinely include light bodyweight exercises in warmup (`arm_circles`, `jumping_jack`) and bodyweight cooldown moves; the previous strict list false-positived on these. The rule still rejects truly mismatched activity types (e.g., `nutrition` in cooldown, `exercise` in nutrition block).

### Removed

- Conformance fixture `invalid/activity-block-mismatch-exercise-in-cooldown` (no longer a violation under the relaxed table).

## [1.6.5] — 2026-05-04

### Added
- Pass-2 rule `ACTIVITY_BLOCK_MISMATCH` rejects activities whose `type` is not allowed in the parent block's `type` (e.g. `exercise` in a `cooldown` block). `ACTIVITY_BLOCK_MISMATCH` added to the public `ErrorCode` union. See `conformance/error-codes.md` for the full allowed-activity table.

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
