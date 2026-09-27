"""Score sentence difficulty from sentence length and word frequency (wordfreq).

Zipf frequency: log10 of occurrences per billion words. 7 = "the", ~4 = uncommon, <3 = rare.
We map the hardest words of a sentence to a rough CEFR band, then blend in length.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from wordfreq import zipf_frequency

from .segment import Sentence

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

# Zipf threshold below which a word is "beyond" a given level. Tuned loosely:
# A1 knows only very frequent words (zipf >= 5.3), C2 knows nearly everything.
_LEVEL_ZIPF_FLOOR = {"A1": 5.3, "A2": 4.8, "B1": 4.3, "B2": 3.8, "C1": 3.2, "C2": 0.0}

_TOKEN_RE = re.compile(r"[^\W\d_]+(?:['’-][^\W\d_]+)*", re.UNICODE)


@dataclass
class Difficulty:
    score: float  # 0 (trivial) .. 100 (very hard)
    level: str  # CEFR band
    hardest_words: list[str]
    mean_zipf: float
    min_zipf: float


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


def level_for_zipf(z: float) -> str:
    for level in LEVELS:
        if z >= _LEVEL_ZIPF_FLOOR[level]:
            return level
    return "C2"


def score_sentence(sentence: Sentence, lang: str) -> Difficulty:
    tokens = tokenize(sentence.text)
    if not tokens:
        return Difficulty(score=0.0, level="A1", hardest_words=[], mean_zipf=7.0, min_zipf=7.0)

    zipfs = [(tok, zipf_frequency(tok, lang)) for tok in tokens]
    # Unknown words (zipf 0) are often names or ASR noise; cap their weight at "rare" not "impossible".
    zipfs = [(t, z if z > 0 else 2.5) for t, z in zipfs]
    values = [z for _, z in zipfs]
    mean_z = sum(values) / len(values)
    sorted_z = sorted(zipfs, key=lambda p: p[1])
    hardest = [t for t, _ in sorted_z[:3]]
    # Use the 2nd-hardest word when available, so one ASR glitch doesn't dominate.
    anchor_z = sorted_z[1][1] if len(sorted_z) > 1 else sorted_z[0][1]

    # Vocabulary component: 0 when anchor is ultra-frequent (7), 100 when ~2.5.
    vocab = max(0.0, min(100.0, (7.0 - anchor_z) / 4.5 * 100.0))
    # Length component: 0 at 3 words, 100 at 20+ words.
    length = max(0.0, min(100.0, (len(tokens) - 3) / 17.0 * 100.0))
    score = round(0.7 * vocab + 0.3 * length, 1)

    level = level_for_zipf(anchor_z)
    # Long sentences bump one band up.
    if len(tokens) >= 12 and level != "C2":
        level = LEVELS[min(LEVELS.index(level) + 1, len(LEVELS) - 1)]

    return Difficulty(score=score, level=level, hardest_words=hardest, mean_zipf=round(mean_z, 2), min_zipf=round(sorted_z[0][1], 2))


def level_index(level: str) -> int:
    return LEVELS.index(level.upper())


def within_level(level: str, max_level: str, min_level: str = "A1") -> bool:
    i = level_index(level)
    return level_index(min_level) <= i <= level_index(max_level)
