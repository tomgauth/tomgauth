"""Command line: one YouTube URL -> deck.json (and optionally an Anki TSV).

Examples
  python -m ytlang https://www.youtube.com/watch?v=XXXX --lang de --level B1 --out deck.json
  python -m ytlang XXXX --lang de --no-llm --save-transcript raw.json      # offline-friendly dev loop
  python -m ytlang --from-transcript raw.json --lang de --level A2 --anki deck.tsv
"""

from __future__ import annotations

import argparse
import os
import sys

from .deck import build_deck, write_anki_tsv, write_deck
from .difficulty import LEVELS, score_sentence, within_level
from .enrich import DEFAULT_MODEL, enrich_sentences
from .segment import segment
from .transcript import extract_video_id, fetch_transcript, load_transcript, save_transcript


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ytlang", description="YouTube video -> language-learning deck")
    p.add_argument("url", nargs="?", help="YouTube URL or 11-char video id")
    p.add_argument("--from-transcript", help="Use a saved transcript JSON instead of fetching")
    p.add_argument("--save-transcript", help="Save the fetched transcript JSON here (for offline reruns)")
    p.add_argument("--lang", required=True, help="Subtitle / target language code, e.g. de, fr, es")
    p.add_argument("--translate-to", default="en", help="Translation language (default: en)")
    p.add_argument("--level", default="B1", choices=LEVELS, help="Learner level; keeps sentences up to this band")
    p.add_argument("--min-level", default="A1", choices=LEVELS, help="Drop sentences easier than this band")
    p.add_argument("--min-words", type=int, default=3)
    p.add_argument("--max-words", type=int, default=14)
    p.add_argument("--pause", type=float, default=0.7, help="Pause (s) between captions that ends a sentence")
    p.add_argument("--max-cards", type=int, default=60, help="Keep at most this many cards (spread across the video)")
    p.add_argument("--title", help="Deck title (default: video id)")
    p.add_argument("--no-llm", action="store_true", help="Skip translation/notes (cards will have empty translations)")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--out", default="deck.json")
    p.add_argument("--anki", help="Also write an Anki-importable TSV here")
    return p


def _spread(items: list, n: int) -> list:
    """Keep at most n items, evenly spread so the deck covers the whole video."""
    if len(items) <= n:
        return items
    step = len(items) / n
    return [items[int(i * step)] for i in range(n)]


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.url and not args.from_transcript:
        print("error: give a YouTube URL or --from-transcript", file=sys.stderr)
        return 2

    if args.from_transcript:
        transcript = load_transcript(args.from_transcript)
        video_id = transcript.video_id
    else:
        video_id = extract_video_id(args.url)
        print(f"Fetching {args.lang} captions for {video_id}…", file=sys.stderr)
        transcript = fetch_transcript(video_id, args.lang)
        if args.save_transcript:
            save_transcript(transcript, args.save_transcript)

    sentences = segment(transcript, pause_threshold=args.pause, max_words=args.max_words, min_words=2)
    print(f"{len(sentences)} sentences after segmentation", file=sys.stderr)

    scored = [(s, score_sentence(s, args.lang)) for s in sentences]
    kept = [
        (s, d)
        for s, d in scored
        if args.min_words <= s.word_count <= args.max_words and within_level(d.level, args.level, args.min_level)
    ]
    print(f"{len(kept)} sentences within {args.min_level}-{args.level} and {args.min_words}-{args.max_words} words", file=sys.stderr)
    kept = _spread(kept, args.max_cards)
    sentences = [s for s, _ in kept]
    difficulties = [d for _, d in kept]

    enrichments = None
    if not args.no_llm:
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
            print(
                "warning: no ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN found; trying the SDK's default credentials "
                "(ant auth login). Use --no-llm to skip translations.",
                file=sys.stderr,
            )
        print(f"Translating + annotating {len(sentences)} sentences with {args.model}…", file=sys.stderr)
        enrichments = enrich_sentences(
            sentences, source_lang=args.lang, target_lang=args.translate_to, level=args.level, model=args.model
        )
        missing = sum(1 for e in enrichments if e is None)
        if missing:
            print(f"warning: {missing} sentences came back without a translation", file=sys.stderr)

    deck = build_deck(
        video_id=video_id,
        title=args.title or video_id,
        lang=args.lang,
        translation_lang=args.translate_to,
        level=args.level,
        sentences=sentences,
        difficulties=difficulties,
        enrichments=enrichments,
        source={"captions": "auto" if transcript.is_generated else "manual", "captionLanguage": transcript.language},
    )
    write_deck(deck, args.out)
    print(f"wrote {len(deck.cards)} cards -> {args.out}", file=sys.stderr)
    if args.anki:
        write_anki_tsv(deck, args.anki)
        print(f"wrote Anki TSV -> {args.anki}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
