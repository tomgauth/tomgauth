import { useEffect, useMemo, useState } from "react";
import type { CardRow, DeckRow } from "../db";
import { saveReview, studyQueue } from "../db";
import { RATINGS, previewInterval, review } from "../sm2";
import { YouTubeClip } from "./YouTubeClip";

interface Props {
  deck: DeckRow;
  onExit: () => void;
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Study({ deck, onExit }: Props) {
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [done, setDone] = useState({ reviewed: 0, again: 0 });

  useEffect(() => {
    let alive = true;
    studyQueue(deck.id).then((q) => alive && setQueue(q));
    return () => {
      alive = false;
    };
  }, [deck.id]);

  const card = queue?.[index];
  const total = queue?.length ?? 0;
  const timestampUrl = useMemo(
    () => (card ? `${deck.videoUrl}&t=${Math.floor(card.start)}s` : deck.videoUrl),
    [card, deck.videoUrl],
  );

  async function rate(quality: number) {
    if (!card || !queue) return;
    const next = review(card, quality);
    await saveReview(card, next);
    const failed = quality < 3;
    setDone((d) => ({ reviewed: d.reviewed + 1, again: d.again + (failed ? 1 : 0) }));
    // Failed cards are re-queued at the end of this session.
    const rest = failed ? [...queue, { ...card, ...next }] : queue;
    setQueue(rest);
    setIndex((i) => i + 1);
    setRevealed(false);
    setReplayKey(0);
  }

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        if (!revealed) setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(ev.key)) {
        void rate(RATINGS[Number(ev.key) - 1].quality);
      } else if (ev.key === "r") {
        setReplayKey((k) => k + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, card]);

  if (queue === null) return <main className="screen"><p className="muted">Loading…</p></main>;

  if (!card) {
    return (
      <main className="screen center">
        <h1>{total === 0 && done.reviewed === 0 ? "Nothing due" : "Session done"}</h1>
        <p className="muted">
          {done.reviewed} reviewed{done.again ? `, ${done.again} to see again` : ""}. Come back when cards are due.
        </p>
        <button className="btn btn--primary" onClick={onExit}>Back to decks</button>
      </main>
    );
  }

  return (
    <main className="screen study">
      <header className="study__bar">
        <button className="btn btn--ghost" onClick={onExit} aria-label="Back">←</button>
        <span className="muted">{deck.title}</span>
        <span className="pill">{Math.min(index + 1, total)} / {total}</span>
      </header>

      <YouTubeClip videoId={deck.videoId} start={card.start} end={card.end} replayKey={replayKey} />

      <div className="study__meta">
        <span className="pill pill--level">{card.level}</span>
        <span className="muted">{fmt(card.start)} – {fmt(card.end)}</span>
        <button className="btn btn--ghost" onClick={() => setReplayKey((k) => k + 1)} title="Replay (r)">↻ Replay</button>
      </div>

      {!revealed ? (
        <div className="study__front">
          <p className="muted">Listen. What did they say?</p>
          <button className="btn btn--primary btn--big" onClick={() => setRevealed(true)}>Reveal</button>
        </div>
      ) : (
        <div className="study__back">
          <p className="sentence" lang={deck.lang}>{card.text}</p>
          <p className="translation" lang={deck.translationLang}>{card.translation || <span className="muted">(no translation in this deck)</span>}</p>
          {card.note && <p className="note">{card.note}</p>}
          {card.keyWords.length > 0 && (
            <ul className="keywords">
              {card.keyWords.map((k) => <li key={k}>{k}</li>)}
            </ul>
          )}
          <a className="muted small" href={timestampUrl} target="_blank" rel="noreferrer">Open in YouTube at {fmt(card.start)}</a>

          <div className="ratings">
            {RATINGS.map((r, i) => (
              <button key={r.label} className={`btn rate rate--${r.label.toLowerCase()}`} onClick={() => rate(r.quality)} title={`${r.hint} (${i + 1})`}>
                <span>{r.label}</span>
                <span className="small">{previewInterval(card, r.quality)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
