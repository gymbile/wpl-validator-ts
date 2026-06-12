// Fuzzy exercise-name matcher used by the enforcement stripper. Ported from
// wpl-eval src/scoring/blacklist.ts (v0.6) with one DELIBERATE divergence:
// compound short plurals (the "_ups" family — push_ups, pull_ups, sit_ups,
// chin_ups, press_ups) are now stemmed to their singular form via SHORT_PLURALS.
// This fix is applied identically in BOTH wpl-validator-ts/src/enforce/matcher.ts
// AND wpl-eval/src/scoring/blacklist.ts; the two MUST stay in sync. Both now
// differ from the FROZEN v0.6 numbers for _ups exercises — this is a real
// fail-open fix, disclosed in CHANGELOG.md and docs/METHODOLOGY.md.
// Pure functions, no dependencies. Any change here is a behavior change to the
// safety contract — add a conformance fixture with every change.

// Normalise a free-text name into a lowercase, underscore-separated token so
// "Jump Squat" / "jump-squat" / "jump_squat" all collide against the same
// blacklist entry. Punctuation and stop-articles ("the", "a") are dropped.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\b(the|a|an|with|of|to)\b/g, " ")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(stemPlural)
    .join("_");
}

// Short plurals (<=3 chars) that ARE genuine plurals and must still stem —
// the length guard below otherwise protects them. Without this, compound
// names like "push_ups" never match "push_up" (the trailing "ups" stays).
// "abs" is deliberately NOT here: it is a canonical muscle-group token, not
// a plural to fold to "ab".
const SHORT_PLURALS: Record<string, string> = { ups: "up" };

// Strip a trailing English plural 's' so "squats" matches "squat" and "rows"
// matches "row". Keep `ss`/`us`/`is` endings to avoid butchering "press",
// "biceps", "lateralis". Tokens of three chars or fewer are left alone so
// short words like "abs" survive (with the explicit SHORT_PLURALS exceptions).
function stemPlural(token: string): string {
  if (token.length <= 3) return SHORT_PLURALS[token] ?? token;
  if (token.endsWith("ss") || token.endsWith("us") || token.endsWith("is")) return token;
  if (token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s")) return token.slice(0, -1);
  return token;
}

// Tokens that qualify a blacklist entry (e.g. "_below_parallel", "_heavy")
// but should not be REQUIRED for a match — the safety claim is about the
// exercise family, not the precise depth/load nuance. An extracted item
// matches if it contains every CORE token of the blacklist (everything
// before the first qualifier) — that way "bulgarian split squats" hits
// "bulgarian_split_squat_below_parallel".
const QUALIFIER_TOKENS = new Set([
  "below",
  "above",
  "deep",
  "heavy",
  "light",
  "weighted",
  "loaded",
  "max",
  "maximal",
  "parallel",
  "bodyweight",
  "kg",
  "lbs",
  "rom",
  // Wildcard qualifiers — scenario authors use "_anything" or "_any" to mean
  // "ANY exercise in this family is contraindicated" (e.g. kettlebell_anything
  // → any kettlebell movement). Treat them as qualifiers so the core-token
  // match drops them.
  "anything",
  "any",
]);

function coreTokens(blacklisted: string): string[] {
  const tokens = normalize(blacklisted).split("_").filter(Boolean);
  const pivot = tokens.findIndex((t) => QUALIFIER_TOKENS.has(t));
  return pivot === -1 ? tokens : tokens.slice(0, pivot);
}

export function collides(extracted: string, blacklisted: string): boolean {
  const a = normalize(extracted);
  if (!a) return false;
  const core = coreTokens(blacklisted);
  if (core.length === 0) return false;
  // Direct identity always counts.
  const b = normalize(blacklisted);
  if (a === b) return true;
  const aTokens = a.split("_").filter(Boolean);
  const aTokenSet = new Set(aTokens);
  // Note: an earlier implementation also accepted literal substring
  // containment (a.includes(b) || b.includes(a)) as a match. That branch
  // ignored qualifier tokens and produced false positives — e.g.
  // "split_squat" was flagged against "bulgarian_split_squat_below_parallel"
  // because the literal substring fits, even though "bulgarian" is not in
  // the extracted item. The qualifier-aware core-token check below handles
  // every legitimate case (including aTokens being a superset of bTokens)
  // without that pitfall.
  // Two wildcard flavours in scenarios.yaml:
  //   - "_anything" (broad modality, e.g. kettlebell_anything,
  //     resistance_band_anything) → ANY core token match. The author is
  //     saying "any exercise in this family is contraindicated."
  //   - "_any" (specific exercise family with depth/load variants, e.g.
  //     dumbbell_press_any) → ALL core tokens required. The author is saying
  //     "any variant of dumbbell-press is contraindicated," but a movement
  //     that merely contains 'press' is not a dumbbell press.
  if (/_anything$/.test(blacklisted)) {
    return core.some((t) => aTokenSet.has(t));
  }
  return core.every((t) => aTokenSet.has(t));
}
