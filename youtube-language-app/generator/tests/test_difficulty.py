from ytlang.difficulty import score_sentence, within_level, level_for_zipf
from ytlang.segment import Sentence


def _s(text):
    return Sentence(text=text, start=0.0, end=1.0, words=text.split())


def test_easy_vs_hard_german():
    easy = score_sentence(_s("ich habe keine ahnung wie das geht"), "de")
    hard = score_sentence(_s("die kaltmiete beträgt neunhundert euro ohne nebenkosten"), "de")
    assert easy.score < hard.score
    assert easy.level in ("A1", "A2", "B1")
    assert "kaltmiete" in hard.hardest_words or "nebenkosten" in hard.hardest_words


def test_length_raises_score():
    short = score_sentence(_s("das ist gut"), "de")
    long = score_sentence(_s("das ist gut und das ist auch gut und das ist wieder gut ja"), "de")
    assert long.score > short.score


def test_level_helpers():
    assert level_for_zipf(6.0) == "A1"
    assert level_for_zipf(4.0) == "B2"
    assert within_level("A2", "B1")
    assert not within_level("C1", "B1")
    assert not within_level("A1", "B1", min_level="A2")
