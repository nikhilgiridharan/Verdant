"""SQL helpers for CarbonPulse API."""

from datetime import datetime, timedelta, timezone

AGG_SUMMARY = """
SELECT
    COALESCE(SUM(emissions_kg_co2e), 0) AS total_kg,
    COUNT(*)::int AS shipments,
    COUNT(DISTINCT supplier_id)::int AS suppliers,
    AVG(NULLIF(carbon_intensity, 0)) AS avg_intensity
FROM shipment_silver_summary
WHERE event_at >= %s AND event_at < %s
"""

TIMESERIES = """
SELECT date_trunc(%s, event_at)::date AS d,
       SUM(emissions_kg_co2e) AS emissions_kg,
       COUNT(*)::int AS shipment_count
FROM shipment_silver_summary
WHERE event_at >= %s
GROUP BY 1
ORDER BY 1
"""

BY_MODE = """
SELECT transport_mode,
       SUM(emissions_kg_co2e) AS emissions_kg
FROM shipment_silver_summary
WHERE event_at >= %s
GROUP BY transport_mode
"""

BY_COUNTRY = """
SELECT s.supplier_country AS country,
       AVG(sup.lat) AS lat,
       AVG(sup.lng) AS lng,
       SUM(s.emissions_kg_co2e) AS emissions_kg,
       COUNT(DISTINCT s.supplier_id)::int AS supplier_count
FROM shipment_silver_summary s
LEFT JOIN suppliers sup ON sup.supplier_id = s.supplier_id
WHERE s.event_at >= %s AND s.supplier_country IS NOT NULL
GROUP BY s.supplier_country
"""


def window_start(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def granularity_sql(granularity: str) -> str:
    g = granularity.lower()
    if g == "week":
        return "week"
    if g == "month":
        return "month"
    return "day"
