from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
LAST_RUN = ROOT / "data_quality" / "last_run.json"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)


def main() -> int:
    results = []
    critical_fail = False
    conn = psycopg2.connect(DATABASE_URL)
    try:
        checks = [
            (
                "null_shipment_id",
                "SELECT COUNT(*) FROM shipment_silver_summary WHERE shipment_id IS NULL",
            ),
            (
                "weight_bounds",
                "SELECT COUNT(*) FROM shipment_silver_summary "
                "WHERE weight_kg IS NULL OR weight_kg < 0.1 OR weight_kg > 50000",
            ),
            (
                "emissions_bounds",
                "SELECT COUNT(*) FROM shipment_silver_summary "
                "WHERE emissions_kg_co2e IS NULL OR emissions_kg_co2e < 0.001 "
                "OR emissions_kg_co2e > 500000",
            ),
            (
                "transport_modes",
                "SELECT COUNT(*) FROM shipment_silver_summary "
                "WHERE transport_mode NOT IN ('AIR','OCEAN','TRUCK','RAIL')",
            ),
            (
                "duplicate_shipment_id",
                "SELECT COUNT(*) FROM ("
                "SELECT shipment_id, COUNT(*) c FROM shipment_silver_summary "
                "GROUP BY shipment_id HAVING COUNT(*)>1) t",
            ),
        ]
        for name, sql in checks:
            with conn.cursor() as cur:
                cur.execute(sql)
                bad = int(cur.fetchone()[0])
            ok = bad == 0
            results.append({"expectation": name, "unexpected_rows": bad, "passed": ok})
            if not ok:
                critical_fail = True

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT AVG(carbon_intensity) FROM shipment_silver_summary
                WHERE carbon_intensity IS NOT NULL
                """
            )
            mean_ci = float(cur.fetchone()[0] or 0)
        mean_ok = 0.01 <= mean_ci <= 10.0
        results.append(
            {"expectation": "carbon_intensity_mean_band", "mean": mean_ci, "passed": mean_ok}
        )
        if not mean_ok:
            critical_fail = True

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pipeline_status (component, status, last_heartbeat, records_processed, last_error)
                VALUES ('ge-checks', %s, %s, %s, NULL)
                ON CONFLICT (component) DO UPDATE SET
                  status = EXCLUDED.status,
                  last_heartbeat = EXCLUDED.last_heartbeat,
                  records_processed = EXCLUDED.records_processed,
                  last_error = EXCLUDED.last_error
                """,
                ("HEALTHY" if not critical_fail else "DEGRADED", datetime.now(timezone.utc), len(results)),
            )
        conn.commit()
    finally:
        conn.close()

    LAST_RUN.parent.mkdir(parents=True, exist_ok=True)
    payload = {"ran_at": datetime.now(timezone.utc).isoformat(), "results": results}
    LAST_RUN.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(json.dumps(payload, indent=2))
    return 1 if critical_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
