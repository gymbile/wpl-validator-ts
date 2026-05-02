# Contributing to @gymbile/wpl-validator

Thanks for your interest. This is the reference TypeScript validator for [WPL](https://wpl.dev). The Elixir sister implementation lives at [`wpl_validator`](https://hex.pm/packages/wpl_validator); both must agree on the conformance suite.

## Dev setup

```bash
npm install
npm test          # vitest run
npm run typecheck # tsc --noEmit, strict
npm run build     # tsup → dist/
```

Node.js >= 20.10 is required (the source uses JSON import attributes).

## Repo layout

```
src/
  index.ts              # public entry — exports validate() and types
  pass1-schema.ts       # ajv compilation + Pass 1 entry point
  types.ts              # public ValidationError / ValidationResult / ErrorCode
  pass2-semantic/
    walker.ts           # tree walker + visitor types (WalkContext, SemanticRule)
    index.ts            # runPass2 entry point
    rules/              # one file per rule, e.g. duplicate-id.ts
schema/                 # vendored from gymbile/wpl
conformance/            # vendored fixtures (valid/, invalid/) + error-codes.md
tests/                  # vitest specs, mirrors src/ layout
```

The walker dispatches each visitor (`enterPlan`, `enterPhase`, …) to every registered rule as it descends. Rules emit findings via `ctx.emit(...)`. See `src/pass2-semantic/walker.ts` for the visitor surface.

## Adding a Pass 2 rule

1. **Upstream first.** Add the fixture (input + expected errors) and rule prose to [`gymbile/wpl`](https://github.com/gymbile/wpl) — that's the source of truth for the spec and the conformance suite.
2. **Vendor.** Once the upstream tag ships, sync `schema/` + `conformance/` here and bump `schema-version.txt`.
3. **Implement.** Add `src/pass2-semantic/rules/<your-rule>.ts` exporting a `SemanticRule`. Register it in `src/index.ts`. Use TDD: write the rule's unit test in `tests/pass2/` first, watch it fail, then implement.
4. **Confirm.** `tests/conformance.test.ts` automatically picks up new fixtures from `conformance/invalid/`. If your rule is wired correctly, that test passes against the vendored fixture too.

## Drift-check policy

`schema/` and `conformance/` are **vendored**, not generated. The weekly [`drift-check.yml`](.github/workflows/drift-check.yml) workflow compares the vendored files against the latest `gymbile/wpl` tag and opens an issue on divergence. When a new upstream tag ships, sync the vendored copies and bump `schema-version.txt` in the same commit.

## Release flow

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Commit, tag (`git tag vX.Y.Z`), push tag.
3. The [`publish.yml`](.github/workflows/publish.yml) workflow builds and publishes to npm using `NPM_TOKEN`. (Trusted Publishing migration is tracked separately.)

## Code style

- TypeScript strict mode; no `any` in `src/`.
- Filenames are kebab-case.
- One rule per file under `src/pass2-semantic/rules/`.
- Rule files export a single named const matching the rule (e.g. `duplicateId`, not default-export).
- Match upstream `meta.reason` enums verbatim — the Elixir sister implementation uses the same strings.
