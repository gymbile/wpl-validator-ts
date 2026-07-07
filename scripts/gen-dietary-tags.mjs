#!/usr/bin/env node
// GENERATOR for src/data/dietary-tags.generated.ts — reads the vendored
// dietary-tags vocab and (re)writes the generated TS module. Deterministic:
// emits ids in JSON order. Run: npm run gen:dietary-tags
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "src/data/dietary-tags.json"), "utf8"));

const ids = data.tags.map((t) => `  ${JSON.stringify(t.id)},`).join("\n");

const out = `// GENERATED — do not edit. Run \`npm run gen:dietary-tags\` to regenerate.
// Source of truth: wpl/data/dietary-tags.json (vendored at src/data/dietary-tags.json).
// Vocab version: ${data.version}

export const DIETARY_TAGS: readonly string[] = [
${ids}
];
`;

writeFileSync(join(root, "src/data/dietary-tags.generated.ts"), out);
console.log(`wrote src/data/dietary-tags.generated.ts (${data.version})`);
