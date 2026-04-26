"""
Helpers for supplier coordinate / seed row generation.

Display names use the same curated public-disclosure-aligned lists as Neon seeding.
"""

from __future__ import annotations

from real_supplier_names import get_supplier_name


def generate_supplier_name(
    country: str,
    industry: str,
    index: int,
    used_names: set[str] | None = None,
) -> str:
    """Resolve a supplier display name; pass one ``used_names`` set across rows for stable de-duplication."""
    bucket = used_names if used_names is not None else set()
    return get_supplier_name(country, industry, bucket, index)
