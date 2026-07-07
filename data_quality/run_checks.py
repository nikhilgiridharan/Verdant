"""Backward-compatible CLI entrypoint; delegates to data_quality.runner."""

from __future__ import annotations

from data_quality.runner import main

if __name__ == "__main__":
    raise SystemExit(main())
