from ytlang.segment import segment
from ytlang.transcript import Transcript, Snippet, load_transcript, extract_video_id

FIX = "tests/fixtures/de_sample.json"


def test_extract_video_id_variants():
    for url in [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "dQw4w9WgXcQ",
    ]:
        assert extract_video_id(url) == "dQw4w9WgXcQ"


def test_segment_drops_noise_and_uses_pauses():
    t = load_transcript(FIX)
    sents = segment(t, pause_threshold=0.7, max_words=14)
    texts = [s.text for s in sents]
    assert all("[Musik]" not in x for x in texts)
    # The 1.4s+ pause after "zu einem neuen video" closes a sentence.
    assert texts[0] == "hallo leute und herzlich willkommen zu einem neuen video"
    # Timestamps are monotonic and each sentence spans real time.
    for a, b in zip(sents, sents[1:]):
        assert a.start <= a.end <= b.start + 0.01
        assert b.end > b.start
    # Fragment "ok" (1 word, then pause) gets merged forward rather than becoming its own card.
    assert not any(x == "ok" for x in texts)


def test_segment_respects_max_words_and_punctuation():
    t = Transcript(
        video_id="x" * 11,
        language="fr",
        snippets=[
            Snippet("bonjour à tous. aujourd'hui on parle", 0.0, 2.0),
            Snippet("de cuisine et de voyages et de plein d'autres choses passionnantes vraiment", 2.0, 4.0),
        ],
    )
    sents = segment(t, max_words=6)
    assert sents[0].text == "bonjour à tous."
    assert all(s.word_count <= 6 for s in sents)


def test_long_chunk_splits_at_snippet_boundary_not_mid_phrase():
    t = load_transcript(FIX)
    texts = [s.text for s in segment(t, max_words=14)]
    assert "heute reden wir über das thema wohnungssuche in berlin" in texts
    assert "ich habe keine ahnung wie das geht ehrlich gesagt" in texts
    assert "die mietpreise sind echt krass gestiegen in den letzten jahren" in texts
