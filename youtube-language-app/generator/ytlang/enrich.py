"""LLM pass: translation + short learner notes for each sentence, generated once at deck-build time.

Uses the Anthropic SDK with structured outputs so the result is guaranteed to parse.
Sentences are sent in batches with surrounding context so idioms are translated in context.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from pydantic import BaseModel, Field

from .segment import Sentence

DEFAULT_MODEL = "claude-opus-5"


class CardNote(BaseModel):
    index: int = Field(description="Index of the sentence in the batch, starting at 0")
    translation: str = Field(description="Natural translation into the target language")
    note: str = Field(description="One or two short sentences: grammar, register, idiom, or a false friend. Empty if nothing is worth saying.")
    key_words: list[str] = Field(default_factory=list, description="Up to 3 words or chunks worth memorising, in their dictionary form")


class BatchNotes(BaseModel):
    cards: list[CardNote]


@dataclass
class Enrichment:
    translation: str
    note: str
    key_words: list[str]


_LANG_NAMES = {
    "de": "German", "fr": "French", "es": "Spanish", "it": "Italian", "pt": "Portuguese",
    "en": "English", "nl": "Dutch", "ru": "Russian", "pl": "Polish", "tr": "Turkish",
    "ja": "Japanese", "zh": "Chinese", "ko": "Korean", "sv": "Swedish", "ar": "Arabic",
}


def lang_name(code: str) -> str:
    return _LANG_NAMES.get(code.lower().split("-")[0], code)


def _system_prompt(source_lang: str, target_lang: str, level: str) -> str:
    return (
        f"You help a {level}-level learner of {lang_name(source_lang)} study real spoken sentences "
        f"taken from YouTube auto-captions. Captions may lack punctuation or contain small ASR errors: "
        f"silently fix obvious ones in your reading, but translate what was clearly meant. "
        f"Translate each sentence into natural {lang_name(target_lang)}, keeping register (casual stays casual). "
        f"Write notes for a {level} learner: only what is genuinely useful, in {lang_name(target_lang)}, no filler."
    )


def _batches(items: list[Sentence], size: int) -> Iterable[tuple[int, list[Sentence]]]:
    for i in range(0, len(items), size):
        yield i, items[i : i + size]


def enrich_sentences(
    sentences: list[Sentence],
    *,
    source_lang: str,
    target_lang: str = "en",
    level: str = "B1",
    model: str = DEFAULT_MODEL,
    batch_size: int = 25,
    client=None,
) -> list[Enrichment | None]:
    """Return one Enrichment per sentence (None if the model declined or the index was missing)."""
    import anthropic  # lazy: only needed when the LLM pass runs

    client = client or anthropic.Anthropic()
    results: list[Enrichment | None] = [None] * len(sentences)
    system = _system_prompt(source_lang, target_lang, level)

    for offset, batch in _batches(sentences, batch_size):
        numbered = "\n".join(f"{i}. {s.text}" for i, s in enumerate(batch))
        user = (
            "Here are consecutive sentences from one video, in order. "
            "Return one entry per index.\n\n" + numbered
        )
        response = client.messages.parse(
            model=model,
            max_tokens=16000,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_format=BatchNotes,
        )
        if response.stop_reason == "refusal" or response.parsed_output is None:
            continue
        for card in response.parsed_output.cards:
            if 0 <= card.index < len(batch):
                results[offset + card.index] = Enrichment(
                    translation=card.translation.strip(),
                    note=card.note.strip(),
                    key_words=[k.strip() for k in card.key_words if k.strip()][:3],
                )
    return results
