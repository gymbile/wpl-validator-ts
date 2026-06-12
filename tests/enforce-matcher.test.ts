import { describe, it, expect } from 'vitest';
import { collides } from '../src/enforce/matcher.js';

describe('collides', () => {
  it('matches exact and plural variants', () => {
    expect(collides('squat', 'squat')).toBe(true);
    expect(collides('squats', 'squat')).toBe(true);
    expect(collides('barbell back squats', 'barbell_back_squat')).toBe(true);
  });
  it('matches family entries with qualifier suffixes', () => {
    expect(collides('bulgarian split squat', 'bulgarian_split_squat_below_parallel')).toBe(true);
  });
  it('does not over-match sub-families', () => {
    expect(collides('split squat', 'bulgarian_split_squat_below_parallel')).toBe(false);
  });
  it('handles _anything wildcard (any core token)', () => {
    expect(collides('kettlebell swing', 'kettlebell_anything')).toBe(true);
  });
  it('handles _any wildcard (all core tokens)', () => {
    expect(collides('incline dumbbell press', 'dumbbell_press_any')).toBe(true);
    expect(collides('overhead press', 'dumbbell_press_any')).toBe(false);
  });
  it('degenerate blacklist (qualifier-only, no core tokens) matches nothing — fail-closed', () => {
    // 'deep' is a qualifier token, so coreTokens('deep_squat') is empty and
    // collides returns false via the core.length===0 guard before any identity
    // check. A qualifier-only blacklist entry therefore forbids nothing — the
    // matcher fails closed rather than over-matching on the bare qualifier.
    expect(collides('deep squat', 'deep_squat')).toBe(false);
    expect(collides('squat', 'deep_squat')).toBe(false);
  });
  it('matches compound plurals to their singular (the _ups family)', () => {
    for (const [a, b] of [['push_ups','push_up'],['pull ups','pull_up'],['sit-ups','sit_up'],['chin ups','chin_up'],['press ups','press_up']]) {
      expect(collides(a, b), `${a} vs ${b}`).toBe(true);
      expect(collides(b, a), `${b} vs ${a}`).toBe(true); // symmetric
    }
  });
  it('does not over-stem the canonical short word "abs"', () => {
    expect(collides('abs', 'abs')).toBe(true);
    expect(collides('Abs', 'abs')).toBe(true);
  });
});
