import { describe, it, expect } from "vitest";
import { newState, review, DAY_MS, previewInterval } from "./sm2";

describe("SM-2", () => {
  it("grows intervals 1 -> 6 -> round(6*EF)", () => {
    const t0 = 1_000_000;
    let s = review(newState(t0), 4, t0);
    expect(s.interval).toBe(1);
    expect(s.due).toBe(t0 + DAY_MS);
    s = review(s, 4, s.due);
    expect(s.interval).toBe(6);
    s = review(s, 4, s.due);
    expect(s.interval).toBe(Math.round(6 * s.easiness));
    expect(s.repetitions).toBe(3);
  });

  it("resets on failure and re-queues in 10 minutes", () => {
    const t0 = 5_000;
    let s = review(newState(t0), 5, t0);
    s = review(s, 5, s.due);
    const failed = review(s, 1, 10_000);
    expect(failed.repetitions).toBe(0);
    expect(failed.interval).toBe(0);
    expect(failed.due).toBe(10_000 + 10 * 60 * 1000);
    expect(failed.easiness).toBeLessThan(s.easiness);
  });

  it("never lets easiness drop below 1.3", () => {
    let s = newState(0);
    for (let i = 0; i < 20; i++) s = review(s, 0, 0);
    expect(s.easiness).toBe(1.3);
  });

  it("previews human-readable intervals", () => {
    expect(previewInterval(newState(0), 1)).toBe("10 min");
    expect(previewInterval(newState(0), 4)).toBe("1 day");
  });
});
