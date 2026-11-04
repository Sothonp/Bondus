"""CountedRequests: one question is reported to the quota API once, however many rounds its answer takes."""
from __future__ import annotations

from src.quota import NEW, REPEAT, TOO_MANY, CountedRequests

ID = "question-12345678"


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_the_first_request_is_new_and_the_next_rounds_are_repeats():
    seen = CountedRequests()
    assert seen.check("tok", ID, 0, True) == NEW
    seen.remember("tok", ID, 0, True)
    assert seen.check("tok", ID, 0, True) == REPEAT
    assert seen.check("tok", ID, 0, True) == REPEAT


def test_a_request_that_was_not_allowed_is_never_a_repeat():
    # Breaks if: asking again after a refusal is waved through without asking the API.
    seen = CountedRequests()
    assert seen.check("tok", ID, 0, True) == NEW
    assert seen.check("tok", ID, 0, True) == NEW


def test_more_photos_than_were_counted_is_new_again():
    # Breaks if: photos added in a later round are never reported to the plan.
    seen = CountedRequests()
    seen.remember("tok", ID, 1, True)
    assert seen.check("tok", ID, 1, True) == REPEAT
    assert seen.check("tok", ID, 2, True) == NEW
    seen.remember("tok", ID, 2, True)
    assert seen.check("tok", ID, 2, True) == REPEAT
    assert seen.check("tok", ID, 1, True) == REPEAT


def test_another_student_or_kind_of_request_is_not_a_repeat():
    # Breaks if: one student's id covers another's, or a document covers a question.
    seen = CountedRequests()
    seen.remember("tok", ID, 0, True)
    assert seen.check("other", ID, 0, True) == NEW
    assert seen.check("tok", ID, 0, False) == NEW
    assert seen.check("tok", "question-87654321", 0, True) == NEW


def test_an_id_used_for_more_rounds_than_an_answer_takes_is_too_many():
    seen = CountedRequests(max_rounds=3)
    seen.remember("tok", ID, 0, True)  # round 1
    assert [seen.check("tok", ID, 0, True) for _ in range(4)] == [REPEAT, REPEAT, TOO_MANY, TOO_MANY]


def test_an_entry_expires():
    clock = Clock()
    seen = CountedRequests(ttl=60, clock=clock)
    seen.remember("tok", ID, 0, True)
    clock.now = 59
    assert seen.check("tok", ID, 0, True) == REPEAT
    clock.now = 61
    assert seen.check("tok", ID, 0, True) == NEW


def test_the_oldest_entries_are_dropped_when_it_is_full():
    # Breaks if: the memory grows without end.
    seen = CountedRequests(max_entries=2)
    for n in range(3):
        seen.remember("tok", f"question-0000000{n}", 0, True)
    assert seen.check("tok", "question-00000000", 0, True) == NEW
    assert seen.check("tok", "question-00000002", 0, True) == REPEAT
