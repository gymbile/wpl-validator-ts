#!/usr/bin/env node
// GENERATOR for src/data/goal-categories.generated.ts — reads the vendored
// goal-categories vocab and (re)writes the generated TS module. Deterministic:
// emits ids in JSON order. Run: npm run gen:goal-categories
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "src/data/goal-categories.json"), "utf8"));

const ids = data.categories.map((c) => `  ${JSON.stringify(c.id)},`).join("\n");

const out = `// GENERATED — do not edit. Run \`npm run gen:goal-categories\` to regenerate.
// Source of truth: wpl/data/goal-categories.json (vendored at src/data/goal-categories.json).
// Vocab version: ${data.version}

export const GOAL_CATEGORIES: readonly string[] = [
${ids}
];
`;

writeFileSync(join(root, "src/data/goal-categories.generated.ts"), out);
console.log(`wrote src/data/goal-categories.generated.ts (${data.version})`);
