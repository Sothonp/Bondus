"""Made-up tokens: turned away without a question to Laravel, and a caller who keeps trying is cut off.

Laravel limits requests by token, and every fake token is a new one; it only sees this server's address, so it
cannot limit by caller. These cover the pieces in src/auth.py that do it here (the whole route is in test_auth.py).
"""
from __future__ import annotations

import asyncio
import zlib

import pytest

from src.auth import AuthUnavailable, LaravelTokenVerifier, LookupBudget, LookupRefused, looks_like_token

ENTROPY = "aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG5hJ7k"  # 40 characters, like Sanctum's


def sanctum(ident: int = 12, entropy: str = ENTROPY) -> str:
    return f"{ident}|{entropy}{zlib.crc32(entropy.encode()) & 0xFFFFFFFF:08x}"


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


class Reply:
    def __init__(self, status_code: int, body: object = None) -> None:
        self.status_code = status_code
        self._body = body

    def json(self) -> object:
        return self._body


class Laravel:
    """Stands in for the HTTP client: answers 200 for the tokens it knows and 401 for the rest, and counts."""

    def __init__(self, known: set[str] | None = None, down: bool = False) -> None:
        self.known = known or set()
        self.down = down
        self.asked = 0

    async def get(self, url, headers):
        self.asked += 1
        if self.down:
            return Reply(500)
        token = headers["Authorization"].removeprefix("Bearer ")
        return Reply(200, {"user": {"id": 7}}) if token in self.known else Reply(401)


def verifier(laravel: Laravel, clock: Clock | None = None, **kwargs) -> LaravelTokenVerifier:
    return LaravelTokenVerifier(
        "https://api.example.test/api/v1/me", client=laravel, clock=clock or Clock(), **kwargs
    )


# --- the shape of a token ---------------------------------------------------------------------------------


def test_a_token_made_the_way_sanctum_makes_them_passes():
    # Breaks if: the check is stricter than Laravel's own tokens -- every student is locked out of the coach.
    assert looks_like_token(sanctum())
    assert looks_like_token(sanctum(ident=123456789))


def test_a_token_from_before_sanctum_added_the_checksum_passes():
    assert looks_like_token(f"5|{ENTROPY}")


@pytest.mark.parametrize(
    "token",
    [
        "",
        "bogus",
        "good-token",
        "|" + ENTROPY,  # no id
        f"x|{ENTROPY}",  # id is not a number
        f"12|{ENTROPY[:30]}",  # too short
        f"12|{ENTROPY}1234567",  # 47 characters: neither shape
        f"12|{ENTROPY}00000000",  # right length, wrong checksum
        f"12|{ENTROPY}" + "a" * 300,  # absurdly long
        f"12|{ENTROPY[:-1]} ",  # a space
        f"१२|{ENTROPY}",  # digits that are not 0-9
        "12|" + "é" * 48,
    ],
)
def test_anything_else_is_turned_away(token):
    # Breaks if: junk is let through to cost Laravel a question.
    assert not looks_like_token(token)


def test_a_wrong_checksum_is_caught_even_when_one_character_differs():
    good = sanctum()
    changed = good[:-1] + ("0" if good[-1] != "0" else "1")
    assert not looks_like_token(changed)


def test_the_verifier_does_not_ask_laravel_about_a_badly_shaped_token_when_told_to_check():
    # Breaks if: the shape check is computed but the question to Laravel is sent anyway.
    laravel = Laravel()
    checking = verifier(laravel, require_token_shape=True)
    assert asyncio.run(checking.verify("bogus")) is None
    assert laravel.asked == 0


def test_the_verifier_asks_laravel_about_a_well_shaped_token():
    # Breaks if: the shape check turns real tokens away, or Laravel is never asked.
    token = sanctum()
    laravel = Laravel({token})
    checking = verifier(laravel, require_token_shape=True)
    assert asyncio.run(checking.verify(token)) == "7"
    assert laravel.asked == 1
    assert checking.remembers(token)


def test_the_verifier_stays_as_it_was_unless_asked_to_check_the_shape():
    # Breaks if: the check is on for code that builds the verifier itself (the existing tests use plain strings).
    laravel = Laravel({"good"})
    assert asyncio.run(verifier(laravel).verify("good")) == "7"


def test_remembers_is_true_only_for_what_verify_would_answer_from_memory():
    # Breaks if: the flood limit counts tokens that cost Laravel nothing, or skips ones that do.
    clock = Clock()
    token = sanctum()
    laravel = Laravel({token})
    checking = verifier(laravel, clock, cache_seconds=60, rejected_seconds=15)
    assert not checking.remembers(token)
    asyncio.run(checking.verify(token))
    assert checking.remembers(token)
    clock.now = 61
    assert not checking.remembers(token)

    nobody = sanctum(entropy="Z" * 40)
    asyncio.run(checking.verify(nobody))
    assert checking.remembers(nobody)
    clock.now = 61 + 16
    assert not checking.remembers(nobody)


# --- the allowance ----------------------------------------------------------------------------------------


def test_a_caller_may_try_a_few_new_tokens_a_minute_and_then_is_told_to_wait():
    # Breaks if: there is no cap per caller.
    clock = Clock()
    budget = LookupBudget(per_address=3, overall=100, clock=clock)
    for _ in range(3):
        budget.reserve("1.2.3.4")
    clock.now = 20
    with pytest.raises(LookupRefused) as refused:
        budget.reserve("1.2.3.4")
    assert refused.value.retry_after == 40  # the first one ages out at 60


def test_the_allowance_comes_back_as_time_passes():
    # Breaks if: a refused caller stays refused for good.
    clock = Clock()
    budget = LookupBudget(per_address=2, overall=100, clock=clock)
    budget.reserve("a")
    budget.reserve("a")
    clock.now = 60
    budget.reserve("a")


def test_one_caller_using_its_allowance_leaves_the_others_theirs():
    # Breaks if: one noisy address blocks everyone.
    budget = LookupBudget(per_address=1, overall=100, clock=Clock())
    budget.reserve("a")
    budget.reserve("b")
    with pytest.raises(LookupRefused):
        budget.reserve("a")


def test_there_is_also_a_cap_for_all_callers_together():
    # Breaks if: a flood from many addresses (IPv6, a botnet) gets round the per-address cap.
    budget = LookupBudget(per_address=10, overall=3, clock=Clock())
    for address in "abc":
        budget.reserve(address)
    with pytest.raises(LookupRefused):
        budget.reserve("d")


def test_a_refused_lookup_does_not_count():
    # Breaks if: being refused extends the refusal, so a caller can never get back in.
    clock = Clock()
    budget = LookupBudget(per_address=1, overall=100, clock=clock)
    budget.reserve("a")
    for _ in range(5):
        with pytest.raises(LookupRefused):
            budget.reserve("a")
    clock.now = 60
    budget.reserve("a")


def test_giving_a_lookup_back_frees_it():
    # Breaks if: students signing in with good tokens use up their address's allowance.
    budget = LookupBudget(per_address=1, overall=1, clock=Clock())
    for _ in range(10):
        budget.reserve("a").give_back()


def test_giving_back_after_it_has_aged_out_is_harmless():
    clock = Clock()
    budget = LookupBudget(per_address=1, overall=1, clock=clock)
    reservation = budget.reserve("a")
    clock.now = 100
    budget.reserve("a")  # clears the old one
    reservation.give_back()  # must not raise, and must not free the newer one
    with pytest.raises(LookupRefused):
        budget.reserve("a")


def test_giving_back_frees_only_its_own_lookup_when_two_start_together():
    # Breaks if: a burst of parallel requests is counted as one.
    budget = LookupBudget(per_address=2, overall=100, clock=Clock())
    first = budget.reserve("a")
    budget.reserve("a")
    first.give_back()
    budget.reserve("a")
    with pytest.raises(LookupRefused):
        budget.reserve("a")


def test_idle_addresses_are_forgotten_so_the_table_cannot_grow_without_end():
    # Breaks if: a flood from many addresses fills the server's memory.
    clock = Clock()
    budget = LookupBudget(per_address=1, overall=100_000, clock=clock)
    for n in range(4096):
        budget.reserve(f"10.0.{n // 256}.{n % 256}")
    clock.now = 120
    budget.reserve("fresh")
    assert len(budget._by_address) < 4096


def test_laravel_being_down_is_not_a_rejected_token():
    # Breaks if: AuthUnavailable is swallowed into "no" (the caller would be struck for our outage).
    checking = verifier(Laravel(down=True))
    with pytest.raises(AuthUnavailable):
        asyncio.run(checking.verify(sanctum()))
