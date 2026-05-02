# @gymbile/wpl-validator

[![npm version](https://img.shields.io/npm/v/@gymbile/wpl-validator.svg)](https://www.npmjs.com/package/@gymbile/wpl-validator)
[![CI](https://github.com/gymbile/wpl-validator-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/gymbile/wpl-validator-ts/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Reference TypeScript validator for [WPL (Wellness Plan Language)](https://wpl.dev).

Validates compiled WPL JSON against:
- **Pass 1:** the canonical [JSON Schema](https://github.com/gymbile/wpl/blob/main/schema/v1.schema.json) (Draft 2020-12, via [ajv](https://ajv.js.org/)).
- **Pass 2:** semantic invariants from the [WPL specification](https://github.com/gymbile/wpl/blob/main/spec/SPECIFICATION.md) — duplicate-ID detection, ref resolution, prescription validity, etc.

Sister implementation: [`wpl_validator`](https://hex.pm/packages/wpl_validator) (Elixir). Both pass the [shared conformance suite](https://github.com/gymbile/wpl/tree/main/conformance) at every release.

## Install

```bash
npm install @gymbile/wpl-validator
```

Requires Node.js >= 20.10.

## Usage

```ts
import { validate, type ValidationResult, type ValidationError } from '@gymbile/wpl-validator';

const plan = JSON.parse(planJson);
const result: ValidationResult = validate(plan);

if (!result.valid) {
  for (const err of result.errors) {
    console.error(`[${err.code}] ${err.path}: ${err.message}`);
  }
}
```

### `ValidationError` shape

```ts
interface ValidationError {
  path: string;       // RFC 6901 JSON Pointer, e.g. "/plan/phases/0/weeks/1/days/2"
  code: string;       // e.g. "DUPLICATE_ID"
  message: string;    // human-readable summary
  severity: 'error' | 'warning';
  meta?: Record<string, unknown>;  // structured detail (rule-specific keys)
}
```

### With a catalog (resolves `*_ref` fields)

```ts
const result = validate(plan, {
  catalog: {
    exercises: new Set(['push_up', 'squat', 'deadlift']),
    meals: new Set(['oatmeal', 'chicken_breast']),
  },
});
```

If no catalog is provided, `UNRESOLVED_REF` checks are skipped.

## Severity semantics

`result.valid` is `true` unless at least one finding has `severity: "error"`. Findings with `severity: "warning"` (currently only `PHASE_DURATION_MISMATCH`) appear in `result.errors` but do **not** invalidate the plan — they're advisory.

If you want to reject warnings too, filter the result yourself:

```ts
const hasAny = result.errors.length > 0;
```

## Pipeline

The validator runs two passes in sequence:

1. **Pass 1 (schema):** ajv compiles the canonical JSON Schema and checks the input against it. Failures emit `SCHEMA_VIOLATION`.
2. **Pass 2 (semantic):** a structural walker descends the plan tree (`plan → phases → weeks → days → blocks → activities`, plus personalization rules, checkpoints, and points rules). Each registered rule visits the relevant nodes and emits findings.

**If Pass 1 fails, Pass 2 is skipped** — semantic checks assume schema-valid shape.

## Error codes

| Code | Severity | Description |
|---|---|---|
| `SCHEMA_VIOLATION` | error | Pass 1 ajv check failed (shape, type, enum, required field, etc.) |
| `DUPLICATE_ID` | error | Two siblings within the same scope share an `id` |
| `UNRESOLVED_REF` | error | An `exercise_ref` / `meal_ref` / `meditation_ref` doesn't exist in the supplied catalog |
| `EMPTY_PHASES_FOR_TYPE` | error | Plan `type: "workout"` or `"hybrid"` has zero phases |
| `INVALID_PRESCRIPTION` | error | Activity prescription has unknown `type` or missing required fields |
| `INVALID_PERSONALIZATION_RULE` | error | Personalization rule has malformed condition or invalid action type/scope |
| `INVALID_POINTS_RULE` | error | Points-system rule missing `action`/`points` or `points` not a non-negative integer |
| `PHASE_DURATION_MISMATCH` | warning | Phase declares `duration: { value, unit }` that doesn't match `weeks.length` |

Canonical reference (with `meta.reason` enums and JSON Pointer rules): [error-codes.md](https://github.com/gymbile/wpl/blob/main/conformance/error-codes.md).

## Conformance

Vendored schema and conformance suite from [`gymbile/wpl@v1.1.1`](https://github.com/gymbile/wpl/releases/tag/v1.1.1). The conformance suite (3 valid + 10 invalid fixtures) is run on every CI build via `npm test`. The suite itself is not shipped to npm; see the [upstream conformance directory](https://github.com/gymbile/wpl/tree/main/conformance).

A weekly `drift-check` workflow flags any divergence between the vendored copies in this repo and the latest upstream tag.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, the rule-addition recipe, and release flow.

## License

Apache-2.0. See [LICENSE](LICENSE).

## Trademark

"WPL" and "Wellness Plan Language" are trademarks of Gymbile. See [the schema repo](https://github.com/gymbile/wpl#trademark) for naming policy.
