import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GOAL_CATEGORIES } from "../src/data/goal-categories.generated.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("goal-categories codegen", () => {
  it("committed generated module equals a fresh codegen run", () => {
    const path = join(root, "src/data/goal-categories.generated.ts");
    const before = readFileSync(path, "utf8");
    execFileSync("node", ["scripts/gen-goal-categories.mjs"], { cwd: root });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("exposes all category ids from the vendored JSON", () => {
    const json = JSON.parse(readFileSync(join(root, "src/data/goal-categories.json"), "utf8"));
    const ids = json.categories.map((c: { id: string }) => c.id);
    expect(GOAL_CATEGORIES).toEqual(ids);
    expect(GOAL_CATEGORIES).toContain("general_fitness");
    expect(GOAL_CATEGORIES).toContain("custom");
  });
});
