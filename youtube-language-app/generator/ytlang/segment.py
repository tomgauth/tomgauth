"""Split a transcript into sentences, each with a start and end time.

Auto-generated YouTube captions usually have no punctuation, so we combine three signals:
1. sentence-final punctuation when it exists,
2. pauses between caption snippets,
3. a cap on sentence length, applied by cutting at the best natural break (largest gap,
   preferring caption-snippet boundaries) rather than at an arbitrary word.
Word timestamps are approximated by spreading each snippet's duration over its words.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .transcript import Transcript

_SENTENCE_END = re.compile(r"[.!?…]+[\"'»)]?$")
_CLEAN_RE = re.compile(r"\[[^\]]*\]|\([^)]*\)")  # [Musik], (applause)
_WS_RE = re.compile(r"\s+")


@dataclass
class Word:
    text: str
    start: float
    end: float
    snippet_start: bool = False  # first word of a caption snippet


@dataclass
class Sentence:
    text: str
    start: float
    end: float
    words: list[str]

    @property
    def word_count(self) -> int:
        return len(self.words)


def _clean(text: str) -> str:
    text = _CLEAN_RE.sub(" ", text)
    text = text.replace("\n", " ").replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", '"')
    return _WS_RE.sub(" ", text).strip()


def words_with_times(transcript: Transcript) -> list[Word]:
    words: list[Word] = []
    for snip in transcript.snippets:
        cleaned = _clean(snip.text)
        if not cleaned:
            continue
        toks = cleaned.split(" ")
        # Weight each word by its length so long words take more of the snippet's time.
        weights = [max(len(t), 1) for t in toks]
        total = float(sum(weights))
        t = snip.start
        for i, (tok, w) in enumerate(zip(toks, weights)):
            dur = snip.duration * (w / total)
            words.append(Word(tok, t, t + dur, snippet_start=(i == 0)))
            t += dur
    return words


def _to_sentence(buf: list[Word]) -> Sentence:
    return Sentence(
        text=" ".join(w.text for w in buf),
        start=round(buf[0].start, 2),
        end=round(buf[-1].end, 2),
        words=[w.text for w in buf],
    )


def _split_long(chunk: list[Word], max_words: int, min_words: int) -> list[list[Word]]:
    """Recursively split a chunk longer than max_words at its most natural break."""
    if len(chunk) <= max_words:
        return [chunk]
    lo, hi = min_words, len(chunk) - min_words  # candidate cut indexes (cut before index i)
    if lo >= hi:
        mid = len(chunk) // 2
        return _split_long(chunk[:mid], max_words, min_words) + _split_long(chunk[mid:], max_words, min_words)
    mid = len(chunk) / 2
    best_i, best_score = None, -1.0
    for i in range(lo, hi + 1):
        gap = max(0.0, chunk[i].start - chunk[i - 1].end)
        score = gap + (0.3 if chunk[i].snippet_start else 0.0)
        # Prefer cuts near the middle so both halves stay balanced.
        score -= abs(i - mid) / len(chunk) * 0.2
        if score > best_score:
            best_i, best_score = i, score
    return _split_long(chunk[:best_i], max_words, min_words) + _split_long(chunk[best_i:], max_words, min_words)


def segment(
    transcript: Transcript,
    *,
    pause_threshold: float = 0.7,
    max_words: int = 14,
    min_words: int = 2,
) -> list[Sentence]:
    """Group timed words into sentences.

    A chunk closes on final punctuation or on a pause longer than `pause_threshold` seconds.
    Chunks longer than `max_words` are split at their most natural internal break.
    Fragments shorter than `min_words` are merged into the following sentence when possible.
    """
    words = words_with_times(transcript)
    chunks: list[list[Word]] = []
    buf: list[Word] = []
    for i, w in enumerate(words):
        buf.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        ends_with_punct = bool(_SENTENCE_END.search(w.text))
        long_pause = nxt is not None and (nxt.start - w.end) > pause_threshold
        if ends_with_punct or long_pause or nxt is None:
            chunks.append(buf)
            buf = []

    sentences: list[Sentence] = []
    for chunk in chunks:
        for part in _split_long(chunk, max_words, min_words):
            sentences.append(_to_sentence(part))

    # Merge tiny fragments forward (e.g. "Ja." + "Genau, das stimmt.")
    merged: list[Sentence] = []
    for s in sentences:
        if merged and merged[-1].word_count < min_words and (merged[-1].word_count + s.word_count) <= max_words:
            prev = merged.pop()
            merged.append(Sentence(text=f"{prev.text} {s.text}", start=prev.start, end=s.end, words=prev.words + s.words))
        else:
            merged.append(s)
    return [s for s in merged if s.word_count >= 1]
