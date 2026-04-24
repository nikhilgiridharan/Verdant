"""Bootstrap demo data for local development."""

from __future__ import annotations

import csv
import hashlib
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg2.extras

from db.connection import get_conn

REPO_ROOT = Path(__file__).resolve().parents[1]
EPA_SEED_CSV = REPO_ROOT / "data" / "seeds" / "epa_emission_factors.csv"

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "changeme_in_production")


def _risk_from_id(supplier_id: str) -> tuple[float, str]:
    score = int(hashlib.md5(supplier_id.encode(), usedforsecurity=False).hexdigest()[:4], 16) / 65535.0
    if score < 0.3:
        tier = "LOW"
    elif score < 0.6:
        tier = "MEDIUM"
    elif score < 0.85:
        tier = "HIGH"
    else:
        tier = "CRITICAL"
    return round(score, 3), tier


def apply_schema() -> None:
    schema_path = os.path.join(os.path.dirname(__file__), "db", "schema.sql")
    with open(schema_path, encoding="utf-8") as f:
        sql = f.read()
    with get_conn() as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(sql)


def seed_epa_emission_factors() -> int:
    """Load EPA v1.4.0 NAICS seed rows from data/seeds into Postgres."""
    if not EPA_SEED_CSV.is_file():
        return 0
    rows = []
    with EPA_SEED_CSV.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(
                (
                    r["transport_mode"].strip(),
                    int(r["naics_code"]),
                    r["naics_title"].strip(),
                    r["epa_version"].strip(),
                    int(r["ghg_data_year"]),
                    int(r["dollar_year"]),
                    r["gwp_standard"].strip(),
                    float(r["sef_without_margins"]),
                    float(r["margins_sef"]),
                    float(r["sef_with_margins"]),
                    float(r["cost_usd_per_tonne_km"]),
                    float(r["kg_co2e_per_tonne_km"]),
                    r["source"].strip(),
                )
            )
    if not rows:
        return 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM epa_emission_factors")
            psycopg2.extras.execute_batch(
                cur,
                """
                INSERT INTO epa_emission_factors (
                    transport_mode, naics_code, naics_title, epa_version, ghg_data_year, dollar_year,
                    gwp_standard, sef_without_margins, margins_sef, sef_with_margins,
                    cost_usd_per_tonne_km, kg_co2e_per_tonne_km, source
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                rows,
                page_size=50,
            )
        conn.commit()
    return len(rows)


def seed_demo_shipments() -> int:
    """Insert synthetic silver rows if table is nearly empty."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM shipment_silver_summary")
            count = cur.fetchone()[0]
            if count > 1000:
                return 0
            cur.execute("SELECT supplier_id, country FROM suppliers LIMIT 500")
            suppliers = cur.fetchall()
            cur.execute("SELECT sku_id FROM skus LIMIT 2000")
            skus = [r[0] for r in cur.fetchall()]
            if not suppliers or not skus:
                return 0
            modes = ["AIR", "OCEAN", "TRUCK", "RAIL"]
            # EPA v1.4.0 derived kg CO2e per tonne-km (see ADR-003)
            factor = {"AIR": 0.5474, "OCEAN": 0.0233, "TRUCK": 0.0920, "RAIL": 0.0077}
            rows = []
            now = datetime.now(timezone.utc)
            for i in range(5000):
                sid, country = random.choice(suppliers)
                sku = random.choice(skus)
                mode = random.choice(modes)
                fk = factor[mode]
                weight = max(0.5, random.lognormvariate(3, 1))
                distance = max(50.0, random.uniform(200, 12000))
                emissions = (weight / 1000.0) * distance * fk
                intensity = emissions / weight if weight else 0
                evt = now - timedelta(hours=random.randint(0, 24 * 365))
                rows.append(
                    (
                        str(uuid.uuid4()),
                        sid,
                        sku,
                        evt,
                        weight,
                        distance,
                        random.uniform(50, 5000),
                        emissions,
                        intensity,
                        mode,
                        f"{country}_US_{mode}",
                        random.random() < 0.02,
                        country,
                        "US",
                        now,
                        now,
                        "v1.4.0",
                        "2024",
                        fk,
                    )
                )
            psycopg2.extras.execute_batch(
                cur,
                """
                INSERT INTO shipment_silver_summary (
                    shipment_id, supplier_id, sku_id, event_at, weight_kg, distance_km,
                    cost_usd, emissions_kg_co2e, carbon_intensity, transport_mode, route_key,
                    is_anomaly, supplier_country, destination_country, processing_timestamp, ingestion_timestamp,
                    emissions_factor_version, emissions_dollar_year, emissions_factor_per_tonne_km
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (shipment_id) DO NOTHING
                """,
                rows,
                page_size=500,
            )
        conn.commit()
        return len(rows)


def seed_risk_scores() -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT supplier_id FROM suppliers")
            ids = [r[0] for r in cur.fetchall()]
            rows = []
            now = datetime.now(timezone.utc)
            for sid in ids:
                score, tier = _risk_from_id(sid)
                rows.append(
                    (
                        sid,
                        score,
                        tier,
                        random.uniform(1000, 50000),
                        random.uniform(5000, 120000),
                        random.choice(["IMPROVING", "STABLE", "WORSENING"]),
                        now,
                        "stub-1.0",
                    )
                )
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
        return len(rows)


def seed_alerts() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM emissions_alerts")
            if cur.fetchone()[0] > 0:
                return
            cur.execute(
                """
                INSERT INTO emissions_alerts (
                    alert_type, severity, supplier_id, sku_id, emissions_kg, threshold_kg, message
                )
                VALUES
                (
                    'ANOMALY', 'HIGH', 'SUP-00001', 'SKU-00001', 2847.0, 800.0,
                    '↑ 340% above baseline | 2,847 kg CO₂'
                ),
                (
                    'SPIKE', 'MEDIUM', 'SUP-00042', NULL, 1200.0, 900.0,
                    'Weekly emissions spike detected'
                ),
                (
                    'THRESHOLD_BREACH', 'LOW', NULL, NULL, 400.0, 350.0,
                    'Platform intensity drift'
                )
                """
            )
        conn.commit()


def seed_pipeline_defaults() -> None:
    components = [
        "kafka-producer",
        "spark-bronze",
        "spark-silver",
        "postgres-sync",
        "quality-checks",
        "ge-checks",
        "api",
    ]
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            for c in components:
                cur.execute(
                    """
                    INSERT INTO pipeline_status (component, status, last_heartbeat, records_processed, last_error)
                    VALUES (%s, 'HEALTHY', %s, %s, NULL)
                    ON CONFLICT (component) DO UPDATE SET
                        status = EXCLUDED.status,
                        last_heartbeat = EXCLUDED.last_heartbeat,
                        records_processed = EXCLUDED.records_processed
                    """,
                    (c, now, random.randint(1_000, 50_000)),
                )
        conn.commit()


def full_bootstrap() -> dict:
    apply_schema()
    epa_rows = seed_epa_emission_factors()
    inserted = seed_demo_shipments()
    risks = seed_risk_scores()
    seed_alerts()
    seed_pipeline_defaults()
    return {
        "epa_factors_seeded": epa_rows,
        "shipments_inserted": inserted,
        "risk_scores_upserted": risks,
    }
