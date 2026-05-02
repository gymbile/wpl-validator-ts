# @gymbile/wpl-validator

[![npm version](https://img.shields.io/npm/v/@gymbile/wpl-validator.svg)](https://www.npmjs.com/package/@gymbile/wpl-validator)
[![CI](https://github.com/gymbile/wpl-validator-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/gymbile/wpl-validator-ts/actions/workflows/ci.yml)

Reference TypeScript validator for [WPL (Wellness Plan Language)](https://wpl.dev).

Validates compiled WPL JSON against:
- **Pass 1:** the canonical [JSON Schema](https://github.com/gymbile/wpl/blob/main/schema/v1.schema.json) (Draft 2020-12).
- **Pass 2:** semantic invariants from the [WPL specification](https://github.com/gymbile/wpl/blob/main/spec/SPECIFICATION.md) — duplicate-ID detection, ref resolution, prescription validity, etc.

Conformance: passes the [shared conformance suite](https://github.com/gymbile/wpl/tree/main/conformance) at every release. Sister implementation: [`wpl_validator`](https://hex.pm/packages/wpl_validator) (Elixir).

## Install

```bash
npm install @gymbile/wpl-validator
```

## Usage

```ts
import { validate, type ValidationResult } from '@gymbile/wpl-validator';

const plan = JSON.parse(planJson);
const result: ValidationResult = validate(plan);

if (!result.valid) {
  for (const err of result.errors) {
    console.error(`[${err.code}] ${err.path}: ${err.message}`);
  }
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

## Conformance

This validator is conformant with WPL v1 if all fixtures in `conformance/` (vendored from `gymbile/wpl@v1.1.0`) pass.

## License

Apache-2.0. See [LICENSE](LICENSE).

"WPL" and "Wellness Plan Language" are trademarks of Gymbile. See [the schema repo](https://github.com/gymbile/wpl#trademark) for naming policy.
