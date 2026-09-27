/** Deck JSON produced by the Python generator (schema 1). */
export interface DeckCard {
  id: string;
  text: string;
  start: number;
  end: number;
  translation: string;
  note: string;
  keyWords: string[];
  level: string;
  score: number;
  hardestWords: string[];
  tags: string[];
}

export interface DeckFile {
  schema: number;
  id: string;
  title: string;
  lang: string;
  translationLang: string;
  level: string;
  videoId: string;
  videoUrl: string;
  createdAt: string;
  cards: DeckCard[];
  source?: Record<string, unknown>;
}

export function isDeckFile(x: unknown): x is DeckFile {
  if (!x || typeof x !== "object") return false;
  const d = x as Partial<DeckFile>;
  return (
    d.schema === 1 &&
    typeof d.id === "string" &&
    typeof d.videoId === "string" &&
    Array.isArray(d.cards) &&
    d.cards.every((c) => typeof c.id === "string" && typeof c.text === "string" && typeof c.start === "number")
  );
}
