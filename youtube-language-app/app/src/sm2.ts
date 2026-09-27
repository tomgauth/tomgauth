/**
 * SM-2 spaced repetition (SuperMemo 2), as used by classic Anki.
 * quality: 0..5 self-rating. <3 = failed (interval resets), >=3 = passed.
 */
export interface Sm2State {
  repetitions: number; // consecutive successful reviews
  interval: number; // days until next review
  easiness: number; // EF, starts at 2.5, floor 1.3
  due: number; // epoch ms
  lastReview: number | null; // epoch ms
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function newState(now = Date.now()): Sm2State {
  return { repetitions: 0, interval: 0, easiness: 2.5, due: now, lastReview: null };
}

export function review(state: Sm2State, quality: number, now = Date.now()): Sm2State {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { repetitions, interval, easiness } = state;

  if (q < 3) {
    repetitions = 0;
    interval = 0; // show again in this session (due now)
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetitions += 1;
  }
  easiness = Math.max(1.3, easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  // Failed cards come back after 10 minutes so they cycle within the same session.
  const due = q < 3 ? now + 10 * 60 * 1000 : now + interval * DAY_MS;
  return { repetitions, interval, easiness: Math.round(easiness * 1000) / 1000, due, lastReview: now };
}

/** The four buttons of the study screen, mapped onto SM-2 quality. */
export const RATINGS = [
  { label: "Again", quality: 1, hint: "No idea" },
  { label: "Hard", quality: 3, hint: "Got it, barely" },
  { label: "Good", quality: 4, hint: "Got it" },
  { label: "Easy", quality: 5, hint: "Too easy" },
] as const;

export function previewInterval(state: Sm2State, quality: number): string {
  const next = review(state, quality, 0);
  if (quality < 3) return "10 min";
  if (next.interval === 1) return "1 day";
  if (next.interval < 30) return `${next.interval} days`;
  return `${Math.round(next.interval / 30)} mo`;
}
