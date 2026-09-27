import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db, importDeck, studyQueue, saveReview, deckStats } from "./db";
import { review } from "./sm2";
import type { DeckFile } from "./types";

const deck: DeckFile = {
  schema: 1, id: "d1", title: "T", lang: "de", translationLang: "en", level: "B1",
  videoId: "abcdefghijk", videoUrl: "https://www.youtube.com/watch?v=abcdefghijk", createdAt: "2026-01-01T00:00:00Z",
  cards: [
    { id: "c1", text: "eins", start: 1, end: 2, translation: "one", note: "", keyWords: [], level: "A1", score: 1, hardestWords: [], tags: [] },
    { id: "c2", text: "zwei", start: 3, end: 4, translation: "two", note: "", keyWords: [], level: "A1", score: 1, hardestWords: [], tags: [] },
  ],
};

beforeEach(async () => {
  await db.cards.clear();
  await db.decks.clear();
});

describe("db", () => {
  it("imports a deck and queues fresh cards in video order", async () => {
    await importDeck(deck, 1000);
    const q = await studyQueue("d1", 1000);
    expect(q.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(await deckStats("d1", 1000)).toEqual({ total: 2, due: 2, fresh: 2, learned: 0 });
  });

  it("keeps review state when the same deck is re-imported", async () => {
    await importDeck(deck, 1000);
    const [c1] = await studyQueue("d1", 1000);
    await saveReview(c1, review(c1, 4, 1000));
    await importDeck({ ...deck, cards: [...deck.cards, { ...deck.cards[0], id: "c3", text: "drei", start: 5, end: 6 }] }, 2000);
    const stored = await db.cards.get("c1");
    expect(stored?.repetitions).toBe(1);
    const q = await studyQueue("d1", 2000);
    expect(q.map((c) => c.id)).toEqual(["c2", "c3"]); // c1 is not due for a day
  });
});
