import json
import subprocess
import sys

from ytlang.deck import build_deck, write_anki_tsv
from ytlang.difficulty import Difficulty
from ytlang.enrich import Enrichment
from ytlang.segment import Sentence


def test_build_deck_and_anki(tmp_path):
    s = [Sentence("das ist gut", 1.0, 2.0, ["das", "ist", "gut"])]
    d = [Difficulty(10.0, "A1", ["gut"], 6.0, 5.5)]
    e = [Enrichment("that's good", "Casual approval.", ["gut"])]
    deck = build_deck(video_id="abcdefghijk", title="T", lang="de", translation_lang="en", level="A2",
                      sentences=s, difficulties=d, enrichments=e)
    data = json.loads(deck.to_json())
    assert data["schema"] == 1
    assert data["cards"][0]["translation"] == "that's good"
    assert data["cards"][0]["start"] == 1.0
    out = tmp_path / "a.tsv"
    write_anki_tsv(deck, out)
    line = out.read_text(encoding="utf-8").splitlines()[0]
    assert line.startswith("das ist gut\t")
    assert "t=1s" in line


def test_cli_offline_no_llm(tmp_path):
    out = tmp_path / "deck.json"
    anki = tmp_path / "deck.tsv"
    r = subprocess.run(
        [sys.executable, "-m", "ytlang", "--from-transcript", "tests/fixtures/de_sample.json", "--lang", "de",
         "--level", "B2", "--no-llm", "--out", str(out), "--anki", str(anki), "--title", "Wohnungssuche"],
        capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stderr
    deck = json.loads(out.read_text(encoding="utf-8"))
    assert deck["title"] == "Wohnungssuche"
    assert deck["videoId"] == "abcdefghijk"
    assert len(deck["cards"]) >= 5
    assert all(c["level"] in ("A1", "A2", "B1", "B2") for c in deck["cards"])
    assert all(c["translation"] == "" for c in deck["cards"])
    assert anki.exists()
