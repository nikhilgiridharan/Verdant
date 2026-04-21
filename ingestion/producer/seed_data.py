"""
Seed PostgreSQL with suppliers, SKUs, and EPA emission factors.
Run via: PYTHONPATH=. python ingestion/producer/seed_data.py
"""

from __future__ import annotations

import os
import random
import string
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
from faker import Faker

from trade_calibration import supplier_tuples_for_postgres

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)

NUM_SUPPLIERS = 500
NUM_SKUS = 2000

CATEGORY_DIST = [
    ("Electronics", 0.25),
    ("Apparel", 0.20),
    ("Auto Parts", 0.15),
    ("Food", 0.15),
    ("Chemicals", 0.10),
    ("Industrial", 0.10),
    ("Other", 0.05),
]

INDUSTRIES = [
    "Manufacturing",
    "Logistics",
    "Retail",
    "Chemicals",
    "Electronics",
    "Automotive",
    "Food & Beverage",
    "Industrial Goods",
]

EPA_ROWS = [
    ("AIR", "0-5000", 0.602, "EPA Supply Chain GHG", 2024),
    ("AIR", "5000+", 0.550, "EPA Supply Chain GHG", 2024),
    ("OCEAN", "0-10000", 0.016, "EPA Supply Chain GHG", 2024),
    ("OCEAN", "10000+", 0.012, "EPA Supply Chain GHG", 2024),
    ("TRUCK", "0-1000", 0.096, "EPA Supply Chain GHG", 2024),
    ("TRUCK", "1000+", 0.089, "EPA Supply Chain GHG", 2024),
    ("RAIL", "0-3000", 0.028, "EPA Supply Chain GHG", 2024),
    ("RAIL", "3000+", 0.022, "EPA Supply Chain GHG", 2024),
]


def ensure_schema(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS suppliers (
            supplier_id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            country VARCHAR NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL,
            tier INT NOT NULL,
            industry VARCHAR
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS skus (
            sku_id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            category VARCHAR NOT NULL,
            hs_code VARCHAR NOT NULL
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS epa_emission_factors (
            transport_mode VARCHAR NOT NULL,
            distance_band_km VARCHAR NOT NULL,
            kg_co2e_per_tonne_km DOUBLE PRECISION NOT NULL,
            source VARCHAR,
            year INT,
            PRIMARY KEY (transport_mode, distance_band_km)
        );
        """
    )


def seed_epa(cur) -> None:
    for row in EPA_ROWS:
        cur.execute(
            """
            INSERT INTO epa_emission_factors (transport_mode, distance_band_km, kg_co2e_per_tonne_km, source, year)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (transport_mode, distance_band_km) DO NOTHING
            """,
            row,
        )


def generate_suppliers(_fake: Faker) -> list[tuple]:
    """City-anchored supplier rows (trade-calibrated distribution)."""
    return supplier_tuples_for_postgres(NUM_SUPPLIERS, 42)


def generate_skus(fake: Faker) -> list[tuple]:
    rows = []
    random.seed(4242)
    for i in range(NUM_SKUS):
        category = _pick_weighted(CATEGORY_DIST)
        slug = "".join(random.choices(string.ascii_uppercase, k=8))
        name = f"{category[:4].upper()}-{slug}-{i+1:04d}"
        hs = f"{random.randint(10, 97)}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}"
        sku_id = f"SKU-{i+1:05d}"
        rows.append((sku_id, name, category, hs))
    return rows


def seed_catalog(conn) -> None:
    with conn.cursor() as cur:
        ensure_schema(cur)
        cur.execute("SELECT COUNT(*) FROM suppliers")
        sc = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM skus")
        kc = cur.fetchone()[0]
        if sc >= NUM_SUPPLIERS and kc >= NUM_SKUS:
            seed_epa(cur)
            conn.commit()
            return

        fake = Faker()
        Faker.seed(42)
        random.seed(42)

        cur.execute("TRUNCATE TABLE skus")
        cur.execute("TRUNCATE TABLE suppliers")

        suppliers = generate_suppliers(fake)
        skus = generate_skus(fake)

        psycopg2.extras.execute_batch(
            cur,
            """
            INSERT INTO suppliers (supplier_id, name, country, lat, lng, tier, industry)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            suppliers,
        )
        psycopg2.extras.execute_batch(
            cur,
            """
            INSERT INTO skus (sku_id, name, category, hs_code)
            VALUES (%s, %s, %s, %s)
            """,
            skus,
        )
        seed_epa(cur)
    conn.commit()


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        seed_catalog(conn)
        print("Seed complete: suppliers, skus, epa_emission_factors")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
