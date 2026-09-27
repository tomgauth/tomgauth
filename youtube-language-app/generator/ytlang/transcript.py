"""Fetch YouTube auto-generated subtitles with timestamps."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from urllib.parse import parse_qs, urlparse


@dataclass
class Snippet:
    text: str
    start: float
    duration: float

    @property
    def end(self) -> float:
        return self.start + self.duration


@dataclass
class Transcript:
    video_id: str
    language: str
    snippets: list[Snippet]
    is_generated: bool = True

    def to_json(self) -> dict:
        return {
            "video_id": self.video_id,
            "language": self.language,
            "is_generated": self.is_generated,
            "snippets": [asdict(s) for s in self.snippets],
        }

    @classmethod
    def from_json(cls, data: dict) -> "Transcript":
        return cls(
            video_id=data["video_id"],
            language=data["language"],
            is_generated=data.get("is_generated", True),
            snippets=[Snippet(s["text"], float(s["start"]), float(s["duration"])) for s in data["snippets"]],
        )


_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def extract_video_id(url_or_id: str) -> str:
    """Accept a bare id, youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ urls."""
    s = url_or_id.strip()
    if _ID_RE.match(s):
        return s
    parsed = urlparse(s)
    host = (parsed.hostname or "").lower()
    if host.endswith("youtu.be"):
        vid = parsed.path.strip("/").split("/")[0]
        if _ID_RE.match(vid):
            return vid
    if "youtube.com" in host or "youtube-nocookie.com" in host:
        q = parse_qs(parsed.query)
        if "v" in q and _ID_RE.match(q["v"][0]):
            return q["v"][0]
        m = re.search(r"/(?:shorts|embed|live|v)/([A-Za-z0-9_-]{11})", parsed.path)
        if m:
            return m.group(1)
    raise ValueError(f"Cannot extract a YouTube video id from: {url_or_id!r}")


def fetch_transcript(video_id: str, language: str) -> Transcript:
    """Fetch subtitles for `video_id` in `language`, preferring auto-generated ones.

    Falls back to a manual transcript in that language if no generated one exists.
    """
    from youtube_transcript_api import YouTubeTranscriptApi  # imported lazily: network-only path

    api = YouTubeTranscriptApi()
    listing = api.list(video_id)
    try:
        chosen = listing.find_generated_transcript([language])
    except Exception:
        chosen = listing.find_transcript([language])
    fetched = chosen.fetch()
    snippets = [Snippet(text=s.text, start=float(s.start), duration=float(s.duration)) for s in fetched]
    return Transcript(
        video_id=video_id,
        language=fetched.language_code,
        snippets=snippets,
        is_generated=bool(getattr(fetched, "is_generated", chosen.is_generated)),
    )


def load_transcript(path: str | Path) -> Transcript:
    """Load a transcript previously saved with `save_transcript` (offline / tests)."""
    return Transcript.from_json(json.loads(Path(path).read_text(encoding="utf-8")))


def save_transcript(transcript: Transcript, path: str | Path) -> None:
    Path(path).write_text(json.dumps(transcript.to_json(), ensure_ascii=False, indent=2), encoding="utf-8")
