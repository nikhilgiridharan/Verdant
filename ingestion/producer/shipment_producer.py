"""
Synthetic shipment event producer for CarbonPulse.
Publishes Avro-encoded events to Kafka with Schema Registry.
"""

from __future__ import annotations

import math
import os
import random
import signal
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from confluent_kafka import SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import StringSerializer
from seed_data import seed_catalog
from trade_calibration import (
    pick_supplier_by_country_weight,
    pick_transport_mode,
    sample_weight_kg_for_mode,
    seasonal_log_line,
    seasonal_rate_multiplier,
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
SCHEMA_REGISTRY_URL = os.environ.get("SCHEMA_REGISTRY_URL", "http://localhost:8081")
PRODUCER_RATE = float(os.environ.get("PRODUCER_RATE", "100"))
TOPIC = "shipment-events"
SCHEMA_PATH = os.environ.get(
    "SHIPMENT_AVRO_SCHEMA_PATH",
    str(Path(__file__).resolve().parents[1] / "schemas" / "shipment_event.avsc"),
)

# ── Transport Cost Rates (aligned with EPA v1.4.0 derivation) ─────────────
# These rates are used to:
# 1. Generate realistic shipment cost_usd in synthetic data
# 2. Align with the cost rates used to derive kg_co2e_per_tonne_km
#    from EPA v1.4.0 cost-based factors
#
# Source: Industry average freight cost benchmarks, 2024
# AIR:   $0.85/tonne-km  (air freight premium)
# OCEAN: $0.04/tonne-km  (bulk ocean shipping)
# TRUCK: $0.12/tonne-km  (long-haul truckload)
# RAIL:  $0.05/tonne-km  (intermodal rail)

COST_RATES_USD_PER_TONNE_KM = {
    "AIR": 0.85,
    "OCEAN": 0.04,
    "TRUCK": 0.12,
    "RAIL": 0.05,
}


def generate_cost_usd(weight_kg: float, distance_km: float, mode: str) -> float:
    """
    Generate realistic shipment cost based on weight, distance, and mode.
    Cost rates aligned with EPA v1.4.0 factor derivation methodology.
    """
    weight_tonnes = weight_kg / 1000.0
    base_cost = weight_tonnes * distance_km * COST_RATES_USD_PER_TONNE_KM[mode]
    # Add ±20% noise for realistic variation
    noise = random.uniform(0.80, 1.20)
    return round(base_cost * noise, 2)


DESTINATIONS = [
    ("US", 39.8283, -98.5795),
    ("US", 40.7128, -74.0060),
    ("US", 34.0522, -118.2437),
    ("DE", 50.1109, 8.6821),
    ("GB", 51.5074, -0.1278),
    ("FR", 48.8566, 2.3522),
    ("BR", -23.5505, -46.6333),
    ("AU", -33.8688, 151.2093),
]

shutdown_flag = threading.Event()


def _handle_sigterm(*_: object) -> None:
    shutdown_flag.set()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def distance_for_mode(mode: str, base_km: float) -> float:
    mult = {"AIR": 1.0, "OCEAN": 1.3, "TRUCK": 1.4, "RAIL": 1.25}[mode]
    return max(1.0, base_km * mult)


def load_catalog(conn) -> tuple[list[dict], list[dict]]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT supplier_id, name, country, lat, lng, tier, industry FROM suppliers"
        )
        sup_rows = cur.fetchall()
        cur.execute("SELECT sku_id, name, category, hs_code FROM skus")
        sku_rows = cur.fetchall()
    suppliers = [
        {
            "supplier_id": r[0],
            "supplier_name": r[1],
            "supplier_country": r[2],
            "supplier_lat": float(r[3]),
            "supplier_lng": float(r[4]),
            "supplier_tier": int(r[5]),
            "industry": r[6],
        }
        for r in sup_rows
    ]
    skus = [
        {"sku_id": r[0], "sku_name": r[1], "product_category": r[2], "hs_code": r[3]}
        for r in sku_rows
    ]
    return suppliers, skus


def build_event(
    supplier: dict,
    sku: dict,
    dest_country: str,
    dest_lat: float,
    dest_lng: float,
) -> dict:
    mode = pick_transport_mode()
    base = haversine_km(
        supplier["supplier_lat"],
        supplier["supplier_lng"],
        dest_lat,
        dest_lng,
    )
    distance_km = distance_for_mode(mode, base)
    weight_kg = sample_weight_kg_for_mode(mode)
    is_anomaly = random.random() < 0.02
    if is_anomaly:
        weight_kg = min(50_000.0, weight_kg * 5.0)
    cost_usd = max(10.0, generate_cost_usd(weight_kg, distance_km, mode))
    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    return {
        "shipment_id": str(uuid.uuid4()),
        "event_timestamp": ts_ms,
        "supplier_id": supplier["supplier_id"],
        "supplier_name": supplier["supplier_name"],
        "supplier_country": supplier["supplier_country"],
        "supplier_lat": supplier["supplier_lat"],
        "supplier_lng": supplier["supplier_lng"],
        "destination_country": dest_country,
        "destination_lat": dest_lat,
        "destination_lng": dest_lng,
        "sku_id": sku["sku_id"],
        "sku_name": sku["sku_name"],
        "product_category": sku["product_category"],
        "transport_mode": mode,
        "weight_kg": float(weight_kg),
        "distance_km": float(distance_km),
        "cost_usd": float(cost_usd),
        "hs_code": sku["hs_code"],
        "supplier_tier": int(supplier["supplier_tier"]),
        "is_anomaly": bool(is_anomaly),
    }


def delivery_report(err, msg) -> None:
    if err is not None:
        print(f"Delivery failed: {err}", file=sys.stderr)


def throughput_logger(stats: dict) -> None:
    while not shutdown_flag.is_set():
        time.sleep(10)
        window = stats.get("window_count", 0)
        total = stats.get("total", 0)
        rate = window / 10.0 if window else 0.0
        print(
            f"Published {window} events | {rate:.1f}/sec | Total: {total}",
            flush=True,
        )
        stats["window_count"] = 0


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    signal.signal(signal.SIGINT, _handle_sigterm)

    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema_str = f.read()

    conn = psycopg2.connect(DATABASE_URL)
    try:
        seed_catalog(conn)
        suppliers, skus = load_catalog(conn)
    finally:
        conn.close()

    if not suppliers or not skus:
        print("Catalog empty after seed; exiting", file=sys.stderr)
        sys.exit(1)

    sr = SchemaRegistryClient({"url": SCHEMA_REGISTRY_URL})

    def to_dict(obj, ctx):
        return obj

    value_serializer = AvroSerializer(sr, schema_str, to_dict)
    producer = SerializingProducer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP,
            "key.serializer": StringSerializer("utf_8"),
            "value.serializer": value_serializer,
            "linger.ms": 5,
            "queue.buffering.max.messages": 200_000,
        }
    )

    stats = {"window_count": 0, "total": 0}
    threading.Thread(target=throughput_logger, args=(stats,), daemon=True).start()

    seasonal_mult = seasonal_rate_multiplier()
    sleep_per = 1.0 / (max(PRODUCER_RATE, 0.1) * seasonal_mult)
    print(
        f"Producer started | topic={TOPIC} | base_rate={PRODUCER_RATE}/s | "
        f"suppliers={len(suppliers)} | skus={len(skus)}",
        flush=True,
    )
    print(seasonal_log_line(seasonal_mult), flush=True)

    while not shutdown_flag.is_set():
        supplier = pick_supplier_by_country_weight(suppliers)
        sku = random.choice(skus)
        dest_country, dest_lat, dest_lng = random.choice(DESTINATIONS)
        event = build_event(supplier, sku, dest_country, dest_lat, dest_lng)
        producer.produce(
            TOPIC,
            key=event["supplier_id"],
            value=event,
            on_delivery=delivery_report,
            headers=[("content-type", b"application/avro")],
        )
        stats["window_count"] += 1
        stats["total"] += 1
        producer.poll(0)
        time.sleep(sleep_per)

    producer.flush(30)
    print("Producer shutdown complete", flush=True)


if __name__ == "__main__":
    main()
