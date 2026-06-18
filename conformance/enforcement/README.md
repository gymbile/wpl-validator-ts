# Enforcement conformance fixtures

Each fixture is a single JSON file:

```json
{
  "description": "what this asserts",
  "plan": { "...compiled WPL JSON...": true },
  "context": { "...ClientContext...": true },
  "rules": [ "...personalization rules..." ],
  "options": { "planStartDate": "..." },
  "expect": {
    "stripped_exercises": ["pistol_squat"],
    "surviving_refs": ["bench_press"],
    "diagnostic_codes": []
  }
}
```

The contract: after `enforce(plan, context, rules, options)`,
- every entry in `expect.stripped_exercises` appears in `result.stripped[].exercise`,
- every entry in `expect.surviving_refs` still appears somewhere in the output plan's activities,
- NO stripped exercise appears anywhere in the output plan (the invariant),
- `expect.diagnostic_codes` exactly matches the set of `result.diagnostics[].code`.

Cross-implementation: the Elixir enforcement port must pass these same fixtures.
