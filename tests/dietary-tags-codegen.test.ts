import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DIETARY_TAGS } from "../src/data/dietary-tags.generated.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("dietary-tags codegen", () => {
  it("committed generated module equals a fresh codegen run", () => {
    const path = join(root, "src/data/dietary-tags.generated.ts");
    const before = readFileSync(path, "utf8");
    execFileSync("node", ["scripts/gen-dietary-tags.mjs"], { cwd: root });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("exposes all tag ids from the vendored JSON", () => {
    const json = JSON.parse(readFileSync(join(root, "src/data/dietary-tags.json"), "utf8"));
    const ids = json.tags.map((t: { id: string }) => t.id);
    expect(DIETARY_TAGS).toEqual(ids);
    expect(DIETARY_TAGS).toContain("vegan");
    expect(DIETARY_TAGS).toContain("gluten_free");
  });
});
