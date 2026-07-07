"""Schema helper tests."""

from __future__ import annotations

from datetime import datetime, timezone

from models.schemas import iso


class TestSchemaHelpers:
    def test_iso_none(self):
        assert iso(None) is None

    def test_iso_naive_datetime_gets_utc(self):
        dt = datetime(2026, 1, 15, 12, 0, 0)
        result = iso(dt)
        assert result is not None
        assert result.endswith("+00:00") or result.endswith("Z")

    def test_iso_aware_datetime(self):
        dt = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        assert iso(dt) == "2026-01-15T12:00:00+00:00"
