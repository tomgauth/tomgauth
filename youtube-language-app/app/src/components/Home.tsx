import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, deckStats, deleteDeck, importDeck, type DeckRow, type DeckStats } from "../db";
import { isDeckFile } from "../types";

interface Props {
  onStudy: (deck: DeckRow) => void;
}

function DeckCard({ deck, onStudy }: { deck: DeckRow; onStudy: () => void }) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  useEffect(() => {
    deckStats(deck.id).then(setStats);
  }, [deck.id, deck.importedAt]);

  return (
    <li className="deck">
      <div className="deck__head">
        <h2>{deck.title}</h2>
        <span className="pill pill--level">{deck.lang.toUpperCase()} · {deck.level}</span>
      </div>
      <p className="muted small">
        {stats ? `${stats.due} due · ${stats.fresh} new · ${stats.learned} learned · ${stats.total} cards` : "…"}
      </p>
      <div className="deck__actions">
        <button className="btn btn--primary" onClick={onStudy} disabled={!!stats && stats.due === 0}>
          {stats && stats.due === 0 ? "Nothing due" : "Study"}
        </button>
        <a className="btn btn--ghost" href={deck.videoUrl} target="_blank" rel="noreferrer">Video</a>
        <button
          className="btn btn--ghost danger"
          onClick={() => {
            if (confirm(`Delete "${deck.title}" and its review history?`)) void deleteDeck(deck.id);
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function Home({ onStudy }: Props) {
  const decks = useLiveQuery(() => db.decks.orderBy("importedAt").reverse().toArray(), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function importJson(text: string) {
    setError(null);
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(text);
      if (!isDeckFile(parsed)) throw new Error("Not a Clip Cards deck (expected schema 1 with cards).");
      await importDeck(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (f) await importJson(await f.text());
    ev.target.value = "";
  }

  async function loadSample() {
    setError(null);
    try {
      const res = await fetch("/decks/wohnungssuche-de.json");
      await importJson(await res.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="screen">
      <header className="home__head">
        <h1>Clip Cards</h1>
        <p className="muted">Real sentences from YouTube, spaced repetition, offline.</p>
      </header>

      {decks && decks.length > 0 ? (
        <ul className="decks">
          {decks.map((d) => <DeckCard key={d.id} deck={d} onStudy={() => onStudy(d)} />)}
        </ul>
      ) : (
        <p className="muted">No deck yet. Import one generated with <code>ytlang</code>, or try the sample.</p>
      )}

      <section className="import">
        <label className="btn btn--primary">
          {busy ? "Importing…" : "Import deck JSON"}
          <input type="file" accept="application/json,.json" onChange={onFile} hidden />
        </label>
        <button className="btn btn--ghost" onClick={loadSample}>Load sample deck</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <footer className="muted small">
        Generate a deck: <code>ytlang &lt;youtube-url&gt; --lang de --level B1 --out deck.json</code>
      </footer>
    </main>
  );
}
