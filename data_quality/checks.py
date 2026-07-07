"""
Data quality checks executed after each pipeline cycle.

Audit (2026): Prior checks lived only in run_checks.py (5 SQL checks + mean band),
were not documented in README, and the Airflow DAG was a stub echo. Checks below
target shipment_silver_summary — the silver table written by processing/seed paths.
"""

from __future__ import annotations

CHECKS: list[dict] = [
    {
        "id": "DQ-001",
        "name": "no_null_emissions",
        "description": "Emissions values must never be null",
        "query": "SELECT COUNT(*) FROM shipment_silver_summary WHERE emissions_kg_co2e IS NULL",
        "expected": 0,
        "operator": "eq",
        "severity": "CRITICAL",
    },
    {
        "id": "DQ-002",
        "name": "no_negative_emissions",
        "description": "Emissions values must be non-negative",
        "query": "SELECT COUNT(*) FROM shipment_silver_summary WHERE emissions_kg_co2e < 0",
        "expected": 0,
        "operator": "eq",
        "severity": "CRITICAL",
    },
    {
        "id": "DQ-003",
        "name": "valid_transport_modes",
        "description": "Transport mode must be AIR, OCEAN, TRUCK, or RAIL",
        "query": """
            SELECT COUNT(*) FROM shipment_silver_summary
            WHERE transport_mode NOT IN ('AIR', 'OCEAN', 'TRUCK', 'RAIL')
        """,
        "expected": 0,
        "operator": "eq",
        "severity": "CRITICAL",
    },
    {
        "id": "DQ-004",
        "name": "no_future_dates",
        "description": "Shipment event_at must not be in the future",
        "query": """
            SELECT COUNT(*) FROM shipment_silver_summary
            WHERE event_at > CURRENT_TIMESTAMP
        """,
        "expected": 0,
        "operator": "eq",
        "severity": "HIGH",
    },
    {
        "id": "DQ-005",
        "name": "emissions_within_bounds",
        "description": "Single-shipment emissions within 0–500,000 kg CO2e",
        "query": """
            SELECT COUNT(*) FROM shipment_silver_summary
            WHERE emissions_kg_co2e > 500000
        """,
        "expected": 0,
        "operator": "eq",
        "severity": "HIGH",
    },
    {
        "id": "DQ-006",
        "name": "supplier_id_not_null",
        "description": "Every shipment must be linked to a supplier",
        "query": "SELECT COUNT(*) FROM shipment_silver_summary WHERE supplier_id IS NULL",
        "expected": 0,
        "operator": "eq",
        "severity": "CRITICAL",
    },
    {
        "id": "DQ-007",
        "name": "data_freshness",
        "description": "Most recent shipment within 24 hours when pipeline is active",
        "query": """
            SELECT COALESCE(
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(event_at))) / 3600,
                999999
            )
            FROM shipment_silver_summary
        """,
        "expected": 24,
        "operator": "lte",
        "severity": "MEDIUM",
    },
    {
        "id": "DQ-008",
        "name": "supplier_coverage",
        "description": "At least 80% of catalog suppliers have shipments in the last 30 days",
        "query": """
            SELECT ROUND(
                COUNT(DISTINCT s.supplier_id)::numeric
                / NULLIF((SELECT COUNT(*) FROM suppliers), 0) * 100,
                1
            )
            FROM shipment_silver_summary s
            WHERE s.event_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        """,
        "expected": 80,
        "operator": "gte",
        "severity": "MEDIUM",
    },
    {
        "id": "DQ-009",
        "name": "no_duplicate_events",
        "description": "No duplicate logical shipments (supplier, time, mode, weight, distance)",
        "query": """
            SELECT COUNT(*) FROM (
                SELECT supplier_id, event_at, transport_mode, weight_kg, distance_km, COUNT(*) AS c
                FROM shipment_silver_summary
                GROUP BY supplier_id, event_at, transport_mode, weight_kg, distance_km
                HAVING COUNT(*) > 1
            ) dupes
        """,
        "expected": 0,
        "operator": "eq",
        "severity": "HIGH",
    },
]
