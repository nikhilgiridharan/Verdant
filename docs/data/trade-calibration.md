# Trade calibration (CarbonPulse producer)

Synthetic shipment events use `ingestion/producer/trade_calibration.py` (repo root) to approximate real **import corridor** and **mode** mixes without changing Kafka topics or Avro schemas.

## Supplier country mix (target shares)

After a large number of events, `supplier_country` in `shipment_silver_summary` should approximate:

| Country | Target share |
|--------|----------------|
| CN | ~26% |
| MX | ~16% |
| CA | ~10% |
| DE | ~5% |
| VN, JP, KR, IN | ~4% each |
| TW | ~3% |
| US | ~24% (remainder, NA / mixed routing) |

Supplier records are seeded via `warehouse/dbt_project/seeds/suppliers.csv` (500 rows) with coordinates jittered near major industrial / port anchors so map views cluster realistically.

## Transport mode mix (targets)

| Mode | Target share |
|------|----------------|
| OCEAN | ~70–73% |
| TRUCK | ~18–20% |
| AIR | ~4–5% |
| RAIL | ~4–5% |

Weights are applied **globally** per event (not per origin bucket).

## Mode-specific weights (cargo)

For reporting / sanity checks over long runs:

| Mode | Typical average `weight_kg` band |
|------|-----------------------------------|
| AIR | ~20–50 (light, high-value) |
| TRUCK | ~200–500 |
| OCEAN | ~5,000–20,000 |
| RAIL | ~8,000–30,000 |

## Seasonal publish rate

Effective event rate is:

`effective_rate ≈ PRODUCER_RATE × seasonal_multiplier(month)`

- **Higher** in **October–November** (peak-season uplift).
- **Lower** in **January–February** (post-holiday lull).

`PRODUCER_RATE` remains the baseline from the environment; the multiplier only scales the sleep interval between publishes.

## Verification SQL

See the checklist in the implementation prompt for `supplier_country` / `transport_mode` percentage queries and weight sanity by mode.
