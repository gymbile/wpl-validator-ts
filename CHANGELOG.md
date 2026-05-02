# Changelog

All notable changes to `@gymbile/wpl-validator`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
