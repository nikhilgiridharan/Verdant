"""
Trade- and seasonally-calibrated weights for synthetic shipment generation.

Targets (aggregate, ~10k+ events):
  supplier_country mix: CN ~26%, MX ~16%, CA ~10%, DE ~5%, VN/JP/KR/IN ~4% each, TW ~3%, US ~24%
  transport_mode mix:   OCEAN ~70–73%, TRUCK ~18–20%, AIR ~4–5%, RAIL ~4–5%

Seasonal publish rate: higher Oct/Nov, lower Jan/Feb; base rate from PRODUCER_RATE env.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, timezone
from typing import Any

# ── Shipment share by supplier country (must sum to 1.0) ──────────────────
# Remainder after listed targets is allocated to US (trans-Pacific / NA corridor).
COUNTRY_SHIPMENT_WEIGHTS: dict[str, float] = {
    "CN": 0.26,
    "MX": 0.16,
    "CA": 0.10,
    "DE": 0.05,
    "VN": 0.04,
    "JP": 0.04,
    "KR": 0.04,
    "IN": 0.04,
    "TW": 0.03,
    "US": 0.24,  # remainder for North America / baseline imports
}

# ── Aggregate transport mix (sums to 1.0) ──────────────────────────────────
TRANSPORT_MODE_WEIGHTS: list[tuple[str, float]] = [
    ("OCEAN", 0.715),
    ("TRUCK", 0.188),
    ("AIR", 0.048),
    ("RAIL", 0.049),
]


def _normalize_weights(weights: dict[str, float]) -> dict[str, float]:
    total = sum(weights.values())
    if total <= 0:
        return weights
    return {k: v / total for k, v in weights.items()}


def pick_transport_mode() -> str:
    """Sample transport mode from calibrated global mix."""
    r = random.random()
    acc = 0.0
    for mode, w in TRANSPORT_MODE_WEIGHTS:
        acc += w
        if r <= acc:
            return mode
    return TRANSPORT_MODE_WEIGHTS[-1][0]


def pick_supplier_by_country_weight(suppliers: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Pick one supplier record so aggregate supplier_country approaches COUNTRY_SHIPMENT_WEIGHTS.
    Groups by supplier_country; samples country first, then uniform supplier within country.
    """
    by_cc: dict[str, list[dict[str, Any]]] = {}
    for s in suppliers:
        cc = s.get("supplier_country") or s.get("country")
        if not cc:
            continue
        by_cc.setdefault(cc, []).append(s)

    weights = {k: v for k, v in COUNTRY_SHIPMENT_WEIGHTS.items() if k in by_cc}
    wnorm = _normalize_weights(weights)
    if not wnorm:
        return random.choice(suppliers)

    codes = list(wnorm.keys())
    probs = [wnorm[c] for c in codes]
    chosen_cc = random.choices(codes, weights=probs, k=1)[0]
    return random.choice(by_cc[chosen_cc])


def sample_weight_kg_for_mode(mode: str) -> float:
    """
    Mode-specific weight distributions (rough guidance for aggregates):
      AIR:   ~20–50 kg
      TRUCK: ~200–500 kg
      OCEAN: ~5k–20k kg
      RAIL:  ~8k–30k kg
    """
    if mode == "AIR":
        w = random.lognormvariate(math.log(32), 0.25)
        return max(5.0, min(120.0, w))
    if mode == "TRUCK":
        w = random.lognormvariate(math.log(350), 0.35)
        return max(50.0, min(8_000.0, w))
    if mode == "OCEAN":
        w = random.lognormvariate(math.log(12_000), 0.45)
        return max(500.0, min(50_000.0, w))
    if mode == "RAIL":
        w = random.lognormvariate(math.log(16_000), 0.4)
        return max(1_000.0, min(50_000.0, w))
    return max(0.1, min(50_000.0, math.exp(random.gauss(3.0, 1.0))))


def seasonal_rate_multiplier(now: datetime | None = None) -> float:
    """
    Multiplier applied to PRODUCER_RATE (effective events/sec = PRODUCER_RATE * multiplier).
    Peak: Oct/Nov (retail / peak season). Trough: Jan/Feb (post-holiday lull).
    """
    dt = now or datetime.now(timezone.utc)
    month = dt.month
    # Piecewise gentle multipliers by month (Northern Hemisphere trade seasonality)
    curve = {
        1: 0.88,
        2: 0.90,
        3: 0.98,
        4: 1.02,
        5: 1.04,
        6: 1.05,
        7: 1.04,
        8: 1.03,
        9: 1.06,
        10: 1.12,
        11: 1.15,
        12: 1.08,
    }
    return float(curve.get(month, 1.0))


def seasonal_log_line(multiplier: float, now: datetime | None = None) -> str:
    dt = now or datetime.now(timezone.utc)
    return (
        f"Seasonal rate multiplier: {multiplier:.3f} (month={dt.month}) | "
        f"effective_rate ≈ PRODUCER_RATE * {multiplier:.3f}"
    )


# ── Supplier seed generation (Postgres + dbt `suppliers.csv`, deterministic) ──
COUNTRY_ANCHORS: dict[str, tuple[float, float, str]] = {
    "CN": (31.23, 121.47, "China"),
    "MX": (19.43, -99.13, "Mexico"),
    "CA": (43.65, -79.38, "Canada"),
    "DE": (53.55, 9.99, "Germany"),
    "VN": (10.82, 106.63, "Vietnam"),
    "JP": (35.68, 139.65, "Japan"),
    "KR": (37.57, 126.98, "South Korea"),
    "IN": (19.08, 72.88, "India"),
    "TW": (25.03, 121.56, "Taiwan"),
    "US": (39.83, -98.58, "United States"),
}

INDUSTRIES: tuple[str, ...] = (
    "Electronics",
    "Apparel",
    "Auto Parts",
    "Food & Beverage",
    "Chemicals",
    "Industrial Machinery",
    "Consumer Goods",
    "Pharmaceuticals",
    "Textiles",
    "Packaging",
)


def supplier_counts_by_shipment_weights(n: int = 500) -> dict[str, int]:
    """Integer supplier counts per country, summed to n, from COUNTRY_SHIPMENT_WEIGHTS."""
    w = COUNTRY_SHIPMENT_WEIGHTS
    raw = {k: int(round(n * v)) for k, v in w.items()}
    diff = n - sum(raw.values())
    keys = sorted(w.keys(), key=lambda k: w[k], reverse=True)
    for i in range(abs(diff)):
        k = keys[i % len(keys)]
        raw[k] += 1 if diff > 0 else -1
    return raw


def generate_supplier_seed_rows(n: int = 500, rng_seed: int = 42) -> list[dict[str, Any]]:
    """City-anchored coordinates with ±0.8° jitter; IDs SUP-00001 … SUP-NNNNN."""
    random.seed(rng_seed)
    counts = supplier_counts_by_shipment_weights(n)
    rows: list[dict[str, Any]] = []
    idx = 0
    for cc in sorted(counts.keys()):
        cnt = counts[cc]
        plat, plng, cname = COUNTRY_ANCHORS[cc]
        for _ in range(cnt):
            idx += 1
            lat = plat + random.uniform(-0.8, 0.8)
            lng = plng + random.uniform(-0.8, 0.8)
            sid = f"SUP-{idx:05d}"
            tier = random.choices([1, 2, 3], weights=[0.2, 0.5, 0.3], k=1)[0]
            ind = random.choice(INDUSTRIES)
            name = f"Supplier {sid} ({cname})"
            rows.append(
                {
                    "supplier_id": sid,
                    "name": name,
                    "country": cc,
                    "country_name": cname,
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                    "tier": tier,
                    "industry": ind,
                }
            )
    rows.sort(key=lambda r: r["supplier_id"])
    return rows


def supplier_tuples_for_postgres(n: int = 500, rng_seed: int = 42) -> list[tuple[Any, ...]]:
    """(supplier_id, name, country, lat, lng, tier, industry) for Postgres `suppliers`."""
    return [
        (r["supplier_id"], r["name"], r["country"], r["lat"], r["lng"], r["tier"], r["industry"])
        for r in generate_supplier_seed_rows(n, rng_seed)
    ]
