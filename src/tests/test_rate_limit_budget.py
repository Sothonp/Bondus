"""The per-address daily budget for Free questions (src/rate_limit.py): the counting on its own, with a fake clock."""
from __future__ import annotations

from datetime import date, timedelta

from src.rate_limit import DailyBudget, network_key


def test_an_address_gets_its_limit_and_no_more():
    budget = DailyBudget(2, today=lambda: date(2026, 11, 4))
    assert budget.take("198.51.100.7", "a")
    assert budget.take("198.51.100.7", "b")
    assert not budget.take("198.51.100.7", "c")


def test_the_same_question_is_counted_once():
    budget = DailyBudget(1, today=lambda: date(2026, 11, 4))
    assert all(budget.take("198.51.100.7", "a") for _ in range(5))
    assert not budget.take("198.51.100.7", "b")


def test_every_address_has_its_own_count():
    budget = DailyBudget(1, today=lambda: date(2026, 11, 4))
    assert budget.take("198.51.100.7", "a")
    assert budget.take("198.51.100.8", "b")


def test_the_count_starts_again_the_next_day():
    day = [date(2026, 11, 4)]
    budget = DailyBudget(1, today=lambda: day[0])
    assert budget.take("198.51.100.7", "a")
    assert not budget.take("198.51.100.7", "b")
    day[0] += timedelta(days=1)
    assert budget.take("198.51.100.7", "b")


def test_zero_means_no_limit():
    budget = DailyBudget(0, today=lambda: date(2026, 11, 4))
    assert all(budget.take("198.51.100.7", str(i)) for i in range(50))


def test_an_ipv6_address_counts_as_its_whole_64_block():
    # One home or phone gets a /64, so changing the last part of the address is not a new person.
    assert network_key("2001:db8:1:2:aaaa::1") == network_key("2001:db8:1:2:bbbb::9")
    assert network_key("2001:db8:1:2::1") != network_key("2001:db8:1:3::1")
    budget = DailyBudget(1, today=lambda: date(2026, 11, 4))
    assert budget.take("2001:db8:1:2:aaaa::1", "a")
    assert not budget.take("2001:db8:1:2:bbbb::9", "b")


def test_an_unreadable_address_is_used_as_it_is():
    assert network_key("unknown") == "unknown"
    assert network_key("198.51.100.7") == "198.51.100.7"
