"""
Batch scoring job: updates supplier_risk_scores from shipment_silver_summary aggregates.

Audit (2026): Previously called hash-based SupplierRiskScorer with supplier_id only.
Now builds the same feature vector as training and passes it to the LightGBM scorer.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from models.supplier_risk_scorer import SupplierRiskScorer  # noqa: E402

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)

FEATURE_SQL = """
    SELECT
        supplier_id,
        COALESCE(SUM(CASE WHEN event_at >= NOW() - INTERVAL '30 days'
            THEN emissions_kg_co2e ELSE 0 END), 0)::float AS emissions_30d_kg,
        COALESCE(SUM(CASE WHEN event_at >= NOW() - INTERVAL '90 days'
            THEN emissions_kg_co2e ELSE 0 END), 0)::float AS emissions_90d_kg,
        COALESCE(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '30 days'), 0)::int
            AS shipment_count_30d,
        COALESCE(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::int
            AS shipment_count_90d,
        COALESCE(AVG(NULLIF(carbon_intensity, 0))
            FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float
            AS avg_carbon_intensity,
        COALESCE(STDDEV(weight_kg) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float
            AS weight_volatility,
        COALESCE(
            COUNT(*) FILTER (WHERE transport_mode = 'AIR'
                AND event_at >= NOW() - INTERVAL '90 days')::float
            / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
            0
        )::float AS air_pct,
        COALESCE(
            COUNT(*) FILTER (WHERE transport_mode = 'OCEAN'
                AND event_at >= NOW() - INTERVAL '90 days')::float
            / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
            0
        )::float AS ocean_pct,
        COALESCE(
            COUNT(*) FILTER (WHERE transport_mode = 'TRUCK'
                AND event_at >= NOW() - INTERVAL '90 days')::float
            / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
            0
        )::float AS truck_pct,
        COALESCE(
            COUNT(*) FILTER (WHERE transport_mode = 'RAIL'
                AND event_at >= NOW() - INTERVAL '90 days')::float
            / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
            0
        )::float AS rail_pct,
        COALESCE(STDDEV(emissions_kg_co2e)
            FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float AS emissions_std_90d,
        COALESCE(AVG(emissions_kg_co2e)
            FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float AS emissions_mean_90d
    FROM shipment_silver_summary
    GROUP BY supplier_id
"""


def main() -> None:
    scorer = SupplierRiskScorer()
    conn = psycopg2.connect(DATABASE_URL)
    rows = []
    now = datetime.now(timezone.utc)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(FEATURE_SQL)
            feature_rows = cur.fetchall()

        for record in feature_rows:
            sid = record["supplier_id"]
            features = dict(record)
            score_payload = scorer.score_supplier(sid, features=features)
            rows.append(
                (
                    sid,
                    score_payload["risk_score"],
                    score_payload["risk_tier"],
                    float(features["emissions_30d_kg"]),
                    float(features["emissions_90d_kg"]),
                    "STABLE",
                    now,
                    score_payload["model_version"],
                )
            )

        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                """
                INSERT INTO supplier_risk_scores (
                  supplier_id, risk_score, risk_tier, emissions_30d_kg, emissions_90d_kg,
                  emissions_trend, last_scored_at, model_version
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (supplier_id) DO UPDATE SET
                  risk_score = EXCLUDED.risk_score,
                  risk_tier = EXCLUDED.risk_tier,
                  emissions_30d_kg = EXCLUDED.emissions_30d_kg,
                  emissions_90d_kg = EXCLUDED.emissions_90d_kg,
                  emissions_trend = EXCLUDED.emissions_trend,
                  last_scored_at = EXCLUDED.last_scored_at,
                  model_version = EXCLUDED.model_version
                """,
                rows,
                page_size=200,
            )
        conn.commit()
    finally:
        conn.close()
    print(f"Scored {len(rows)} suppliers")


if __name__ == "__main__":
    main()
