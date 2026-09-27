"""Package sentences into the deck JSON the PWA consumes, plus an Anki-friendly TSV export."""

from __future__ import annotations

import csv
import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path

from .difficulty import Difficulty
from .enrich import Enrichment
from .segment import Sentence

SCHEMA_VERSION = 1


@dataclass
class Card:
    id: str
    text: str
    start: float
    end: float
    translation: str
    note: str
    keyWords: list[str]
    level: str
    score: float
    hardestWords: list[str]
    tags: list[str] = field(default_factory=list)


@dataclass
class Deck:
    schema: int
    id: str
    title: str
    lang: str
    translationLang: str
    level: str
    videoId: str
    videoUrl: str
    createdAt: str
    cards: list[Card]
    source: dict = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)


def _card_id(video_id: str, start: float, text: str) -> str:
    h = hashlib.sha1(f"{video_id}|{start:.2f}|{text}".encode("utf-8")).hexdigest()
    return h[:12]


def build_deck(
    *,
    video_id: str,
    title: str,
    lang: str,
    translation_lang: str,
    level: str,
    sentences: list[Sentence],
    difficulties: list[Difficulty],
    enrichments: list[Enrichment | None] | None = None,
    source: dict | None = None,
) -> Deck:
    enrichments = enrichments or [None] * len(sentences)
    cards: list[Card] = []
    for s, d, e in zip(sentences, difficulties, enrichments):
        cards.append(
            Card(
                id=_card_id(video_id, s.start, s.text),
                text=s.text,
                start=s.start,
                end=s.end,
                translation=e.translation if e else "",
                note=e.note if e else "",
                keyWords=e.key_words if e else [],
                level=d.level,
                score=d.score,
                hardestWords=d.hardest_words,
                tags=[lang, d.level],
            )
        )
    return Deck(
        schema=SCHEMA_VERSION,
        id=f"{video_id}-{level.lower()}-{lang}",
        title=title,
        lang=lang,
        translationLang=translation_lang,
        level=level,
        videoId=video_id,
        videoUrl=f"https://www.youtube.com/watch?v={video_id}",
        createdAt=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        cards=cards,
        source=source or {},
    )


def write_deck(deck: Deck, path: str | Path) -> None:
    Path(path).write_text(deck.to_json(), encoding="utf-8")


def write_anki_tsv(deck: Deck, path: str | Path) -> None:
    """Anki import: Front = sentence, Back = translation + note + link to the exact moment, Tags."""
    with Path(path).open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL)
        for c in deck.cards:
            link = f"{deck.videoUrl}&t={int(c.start)}s"
            back_parts = [c.translation or "(no translation)"]
            if c.note:
                back_parts.append(f"<i>{c.note}</i>")
            back_parts.append(f'<a href="{link}">▶ {int(c.start // 60)}:{int(c.start % 60):02d}</a>')
            w.writerow([c.text, "<br>".join(back_parts), " ".join(c.tags)])
