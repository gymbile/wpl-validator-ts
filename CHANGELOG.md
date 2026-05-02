# Changelog

All notable changes to `@gymbile/wpl-validator`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
