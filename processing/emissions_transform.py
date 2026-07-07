"""
Pure-Python shipment → silver row transform.

Mirrors the EPA v1.4.0 emissions formula in processing/silver_transformer.py
without PySpark. Used by tests, bootstrap seeding, and pipeline benchmarks.
"""

from __future__ import annotations

from datetime import datetime, timezone

# Derived kg CO2e per tonne-km (ADR-003; matches api/bootstrap.py seed factors)
EPA_KG_CO2E_PER_TONNE_KM: dict[str, float] = {
    "AIR": 0.5474,
    "OCEAN": 0.0233,
    "TRUCK": 0.0920,
    "RAIL": 0.0077,
}

EMISSIONS_FACTOR_VERSION = "v1.4.0"
EMISSIONS_DOLLAR_YEAR = "2024"


def compute_emissions_kg(weight_kg: float, distance_km: float, transport_mode: str) -> float:
    """emissions_kg_co2e = (weight_kg / 1000) * distance_km * kg_co2e_per_tonne_km"""
    if weight_kg < 0:
        raise ValueError("weight_kg must be non-negative")
    mode = transport_mode.upper()
    factor = EPA_KG_CO2E_PER_TONNE_KM.get(mode)
    if factor is None:
        raise ValueError(f"unknown transport mode: {transport_mode}")
    return (weight_kg / 1000.0) * distance_km * factor


def transform_event_to_silver_row(event: dict) -> tuple:
    """
    Map a Kafka shipment event dict to a shipment_silver_summary INSERT tuple.
    Applies the same quality filters as silver_transformer (positive weight/distance/emissions).
    """
    weight_kg = float(event["weight_kg"])
    distance_km = float(event["distance_km"])
    mode = str(event["transport_mode"]).upper()
    factor = EPA_KG_CO2E_PER_TONNE_KM[mode]

    emissions = compute_emissions_kg(weight_kg, distance_km, mode)
    if weight_kg <= 0 or distance_km <= 0 or emissions <= 0 or emissions >= 500_000:
        raise ValueError("event failed silver quality filters")

    intensity = emissions / weight_kg if weight_kg else 0.0
    ts_ms = event.get("event_timestamp")
    if ts_ms is not None:
        event_at = datetime.fromtimestamp(int(ts_ms) / 1000.0, tz=timezone.utc)
    else:
        event_at = datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    route_key = f"{event.get('supplier_country', 'XX')}_{event.get('destination_country', 'US')}_{mode}"

    return (
        event["shipment_id"],
        event["supplier_id"],
        event["sku_id"],
        event_at,
        weight_kg,
        distance_km,
        float(event.get("cost_usd", 0.0)),
        emissions,
        intensity,
        mode,
        route_key,
        bool(event.get("is_anomaly", False)),
        event.get("supplier_country"),
        event.get("destination_country"),
        now,
        now,
        EMISSIONS_FACTOR_VERSION,
        EMISSIONS_DOLLAR_YEAR,
        factor,
    )


SILVER_INSERT_SQL = """
    INSERT INTO {table} (
        shipment_id, supplier_id, sku_id, event_at, weight_kg, distance_km,
        cost_usd, emissions_kg_co2e, carbon_intensity, transport_mode, route_key,
        is_anomaly, supplier_country, destination_country, processing_timestamp,
        ingestion_timestamp, emissions_factor_version, emissions_dollar_year,
        emissions_factor_per_tonne_km
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""

BENCHMARK_TABLE_DDL = """
    CREATE TABLE IF NOT EXISTS _benchmark_shipments (
        LIKE shipment_silver_summary INCLUDING ALL
    )
"""
