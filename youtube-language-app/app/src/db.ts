import Dexie, { type Table } from "dexie";
import type { DeckCard, DeckFile } from "./types";
import { newState, type Sm2State } from "./sm2";

export interface DeckRow {
  id: string;
  title: string;
  lang: string;
  translationLang: string;
  level: string;
  videoId: string;
  videoUrl: string;
  createdAt: string;
  importedAt: number;
  cardCount: number;
}

export type CardRow = DeckCard & Sm2State & { deckId: string };

export class ClipCardsDB extends Dexie {
  decks!: Table<DeckRow, string>;
  cards!: Table<CardRow, string>;

  constructor() {
    super("clipcards");
    this.version(1).stores({
      decks: "id, importedAt",
      cards: "id, deckId, due, [deckId+due]",
    });
  }
}

export const db = new ClipCardsDB();

/** Import (or re-import) a deck file. Existing review state for cards with the same id is kept. */
export async function importDeck(file: DeckFile, now = Date.now()): Promise<DeckRow> {
  const row: DeckRow = {
    id: file.id,
    title: file.title,
    lang: file.lang,
    translationLang: file.translationLang,
    level: file.level,
    videoId: file.videoId,
    videoUrl: file.videoUrl,
    createdAt: file.createdAt,
    importedAt: now,
    cardCount: file.cards.length,
  };
  await db.transaction("rw", db.decks, db.cards, async () => {
    const existing = await db.cards.where("deckId").equals(file.id).toArray();
    const stateById = new Map(existing.map((c) => [c.id, c]));
    const rows: CardRow[] = file.cards.map((c) => {
      const prev = stateById.get(c.id);
      const state: Sm2State = prev
        ? { repetitions: prev.repetitions, interval: prev.interval, easiness: prev.easiness, due: prev.due, lastReview: prev.lastReview }
        : newState(now);
      return { ...c, ...state, deckId: file.id };
    });
    await db.cards.where("deckId").equals(file.id).delete();
    await db.cards.bulkPut(rows);
    await db.decks.put(row);
  });
  return row;
}

export async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction("rw", db.decks, db.cards, async () => {
    await db.cards.where("deckId").equals(deckId).delete();
    await db.decks.delete(deckId);
  });
}

export interface DeckStats {
  total: number;
  due: number;
  fresh: number; // never reviewed
  learned: number; // interval >= 21 days
}

export async function deckStats(deckId: string, now = Date.now()): Promise<DeckStats> {
  const cards = await db.cards.where("deckId").equals(deckId).toArray();
  return {
    total: cards.length,
    due: cards.filter((c) => c.due <= now).length,
    fresh: cards.filter((c) => c.lastReview === null).length,
    learned: cards.filter((c) => c.interval >= 21).length,
  };
}

/** Build a study queue: due reviews first (oldest due first), then up to `newLimit` fresh cards in video order. */
export async function studyQueue(deckId: string, now = Date.now(), newLimit = 15): Promise<CardRow[]> {
  const cards = await db.cards.where("deckId").equals(deckId).toArray();
  const reviews = cards.filter((c) => c.lastReview !== null && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = cards.filter((c) => c.lastReview === null).sort((a, b) => a.start - b.start).slice(0, newLimit);
  return [...reviews, ...fresh];
}

export async function saveReview(card: CardRow, state: Sm2State): Promise<void> {
  await db.cards.update(card.id, { ...state });
}
