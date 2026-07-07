"""Tests for api.db.queries SQL helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from db.queries import granularity_sql, window_start


class TestWindowStart:
    def test_window_start_is_in_the_past(self):
        start = window_start(30)
        now = datetime.now(timezone.utc)
        assert start < now
        assert now - start <= timedelta(days=31)

    def test_window_start_respects_days_argument(self):
        start = window_start(7)
        now = datetime.now(timezone.utc)
        delta = now - start
        assert 6 <= delta.days <= 8


class TestGranularitySql:
    def test_day_default(self):
        assert granularity_sql("day") == "day"

    def test_week(self):
        assert granularity_sql("week") == "week"

    def test_month(self):
        assert granularity_sql("month") == "month"

    def test_case_insensitive(self):
        assert granularity_sql("WEEK") == "week"
        assert granularity_sql("Month") == "month"
