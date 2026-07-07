"""Shared pytest fixtures — no live database or external services."""

from __future__ import annotations

import os
from contextlib import ExitStack, contextmanager
from typing import Any, Iterator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("CARBONPULSE_SKIP_LIFESPAN_DB", "1")


class _MockCursor:
    """Cursor mock that returns scripted fetchone/fetchall results per execute."""

    def __init__(self, script: list[tuple[str, Any]]):
        self._script = list(script)
        self._step = 0

    def execute(self, sql: str, params: Any = None) -> None:
        return None

    def fetchone(self) -> Any:
        if self._step >= len(self._script):
            return None
        kind, payload = self._script[self._step]
        self._step += 1
        if kind == "one":
            return payload
        if kind == "all":
            return payload
        return None

    def fetchall(self) -> list[Any]:
        if self._step >= len(self._script):
            return []
        kind, payload = self._script[self._step]
        self._step += 1
        if kind == "all":
            return payload
        if kind == "one":
            return [payload]
        return []

    def __enter__(self) -> _MockCursor:
        return self

    def __exit__(self, *args: object) -> None:
        return None


@contextmanager
def _mock_connection(script: list[tuple[str, Any]]) -> Iterator[MagicMock]:
    conn = MagicMock()
    cursor = _MockCursor(script)
    conn.cursor.return_value = cursor
    yield conn


@pytest.fixture
def client() -> Iterator[TestClient]:
    from main import app

    with TestClient(app) as test_client:
        yield test_client


_GET_CONN_PATCH_TARGETS = [
    "db.connection.get_conn",
    "routers.emissions.get_conn",
    "routers.suppliers.get_conn",
    "routers.pipeline.get_conn",
    "routers.forecasts.get_conn",
    "routers.skus.get_conn",
]


@pytest.fixture
def mock_get_conn():
    """Patch get_conn where routers imported it (not only db.connection)."""

    def _apply(script: list[tuple[str, Any]]):
        @contextmanager
        def _get_conn():
            with _mock_connection(script) as conn:
                yield conn

        @contextmanager
        def _wrapper():
            with ExitStack() as stack:
                for target in _GET_CONN_PATCH_TARGETS:
                    stack.enter_context(patch(target, _get_conn))
                yield

        return _wrapper()

    return _apply
