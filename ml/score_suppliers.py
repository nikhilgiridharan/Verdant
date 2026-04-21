"""
Batch scoring job: updates supplier_risk_scores from shipment_silver_summary aggregates.
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


def main() -> None:
    scorer = SupplierRiskScorer()
    conn = psycopg2.connect(DATABASE_URL)
    rows = []
    now = datetime.now(timezone.utc)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT supplier_id FROM suppliers")
            ids = [r[0] for r in cur.fetchall()]

        with conn.cursor() as cur:
            for sid in ids:
                score_payload = scorer.score_supplier(sid)
                cur.execute(
                    """
                    SELECT COALESCE(SUM(emissions_kg_co2e),0)
                    FROM shipment_silver_summary
                    WHERE supplier_id=%s AND event_at >= NOW() - INTERVAL '30 days'
                    """,
                    (sid,),
                )
                e30 = float(cur.fetchone()[0])
                cur.execute(
                    """
                    SELECT COALESCE(SUM(emissions_kg_co2e),0)
                    FROM shipment_silver_summary
                    WHERE supplier_id=%s AND event_at >= NOW() - INTERVAL '90 days'
                    """,
                    (sid,),
                )
                e90 = float(cur.fetchone()[0])
                rows.append(
                    (
                        sid,
                        score_payload["risk_score"],
                        score_payload["risk_tier"],
                        e30,
                        e90,
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
