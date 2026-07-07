"""
Pipeline throughput benchmark.

Measures actual events/sec through each pipeline stage independently and
end-to-end. Run with: make benchmark

Event path audited (2026):
  ingestion/producer/shipment_producer.py  — build_event(), Avro Kafka produce
  processing/spark_processor.py          — PySpark Kafka → Delta bronze (not timed here;
                                           requires Spark cluster; e2e uses Python consumer)
  processing/emissions_transform.py      — EPA v1.4.0 silver transform (mirrors silver_transformer)
  shipment_silver_summary                — Postgres write target (local Docker only for benchmarks)

Prerequisites: Docker services running (make up). Kafka from host: localhost:29092.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import random
import statistics
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "ingestion" / "producer"))

from processing.emissions_transform import (  # noqa: E402
    BENCHMARK_TABLE_DDL,
    SILVER_INSERT_SQL,
    transform_event_to_silver_row,
)

# Reuse producer event construction (trade-calibrated synthetic shipments)
from shipment_producer import (  # noqa: E402
    DESTINATIONS,
    SCHEMA_PATH,
    TOPIC,
    build_event,
    load_catalog,
)

logging.getLogger("confluent_kafka").setLevel(logging.CRITICAL)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
SCHEMA_REGISTRY_URL = os.environ.get("SCHEMA_REGISTRY_URL", "http://localhost:8081")

_CATALOG: tuple[list[dict], list[dict]] | None = None


def _memory_catalog() -> tuple[list[dict], list[dict]]:
    """In-memory catalog when Postgres is unavailable (CI smoke tests)."""
    locations = [
        ("CN", 31.23, 121.47),
        ("US", 40.71, -74.01),
        ("DE", 50.11, 8.68),
        ("VN", 10.82, 106.63),
        ("MX", 19.43, -99.13),
    ]
    suppliers = []
    for i in range(1, 501):
        c, lat, lng = locations[(i - 1) % len(locations)]
        suppliers.append(
            {
                "supplier_id": f"SUP-{i:05d}",
                "supplier_name": f"Supplier {i}",
                "supplier_country": c,
                "supplier_lat": lat,
                "supplier_lng": lng,
                "supplier_tier": (i % 3) + 1,
                "industry": "Manufacturing",
            }
        )
    skus = [
        {
            "sku_id": f"SKU-{i:05d}",
            "sku_name": f"SKU {i}",
            "product_category": "Electronics",
            "hs_code": f"8471{i:04d}",
        }
        for i in range(1, 2001)
    ]
    return suppliers, skus


def get_catalog() -> tuple[list[dict], list[dict]]:
    global _CATALOG
    if _CATALOG is not None:
        return _CATALOG
    try:
        import psycopg2

        conn = psycopg2.connect(DATABASE_URL)
        try:
            suppliers, skus = load_catalog(conn)
            if suppliers and skus:
                _CATALOG = (suppliers, skus)
                return _CATALOG
        finally:
            conn.close()
    except Exception:
        pass
    _CATALOG = _memory_catalog()
    return _CATALOG


def generate_synthetic_event() -> dict:
    suppliers, skus = get_catalog()
    supplier = random.choice(suppliers)
    sku = random.choice(skus)
    dest_country, dest_lat, dest_lng = random.choice(DESTINATIONS)
    return build_event(supplier, sku, dest_country, dest_lat, dest_lng)


def _make_kafka_producer():
    from confluent_kafka import SerializingProducer
    from confluent_kafka.schema_registry import SchemaRegistryClient
    from confluent_kafka.schema_registry.avro import AvroSerializer
    from confluent_kafka.serialization import StringSerializer

    schema_str = Path(SCHEMA_PATH).read_text(encoding="utf-8")
    sr = SchemaRegistryClient({"url": SCHEMA_REGISTRY_URL})

    def to_dict(obj, _ctx):
        return obj

    value_serializer = AvroSerializer(sr, schema_str, to_dict)
    producer = SerializingProducer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP,
            "key.serializer": StringSerializer("utf_8"),
            "value.serializer": value_serializer,
            "linger.ms": 5,
            "queue.buffering.max.messages": 500_000,
        }
    )
    return producer


def _port_open(host: str, port: int, timeout: float = 0.5) -> bool:
    import socket

    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _parse_host_port(bootstrap: str) -> tuple[str, int]:
    if "://" in bootstrap:
        bootstrap = bootstrap.split("://", 1)[1]
    host, port_str = bootstrap.rsplit(":", 1)
    return host, int(port_str)


def _kafka_available() -> bool:
    host, port = _parse_host_port(KAFKA_BOOTSTRAP)
    if not _port_open(host, port):
        return False
    try:
        from confluent_kafka.admin import AdminClient

        admin = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})
        admin.list_topics(timeout=2)
        return True
    except Exception:
        return False


def _postgres_available() -> bool:
    from urllib.parse import urlparse

    parsed = urlparse(DATABASE_URL)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    if not _port_open(host, port):
        return False
    try:
        import psycopg2

        conn = psycopg2.connect(DATABASE_URL)
        conn.close()
        return True
    except Exception:
        return False


def benchmark_event_generation(n_events: int = 10000, runs: int = 3) -> dict:
    timings: list[float] = []
    sample_event = None

    for _ in range(runs):
        events = []
        start = time.perf_counter()
        for _ in range(n_events):
            event = generate_synthetic_event()
            events.append(event)
        elapsed = time.perf_counter() - start
        timings.append(elapsed)
        if sample_event is None and events:
            sample_event = events[0]

    avg_time = statistics.mean(timings)
    return {
        "stage": "event_generation",
        "events": n_events,
        "runs": runs,
        "avg_seconds": round(avg_time, 3),
        "min_seconds": round(min(timings), 3),
        "max_seconds": round(max(timings), 3),
        "throughput_eps": round(n_events / avg_time, 1),
        "sample_event_size_bytes": len(json.dumps(sample_event).encode()) if sample_event else None,
    }


def benchmark_kafka_produce(n_events: int = 10000, runs: int = 3) -> dict:
    if not _kafka_available():
        raise RuntimeError(
            f"Kafka not reachable at {KAFKA_BOOTSTRAP}. Start Docker: make up && make kafka-topics"
        )

    producer = _make_kafka_producer()
    timings: list[float] = []

    for _ in range(runs):
        start = time.perf_counter()
        for _ in range(n_events):
            event = generate_synthetic_event()
            producer.produce(TOPIC, key=event["supplier_id"], value=event)
            producer.poll(0)
        producer.flush(30)
        elapsed = time.perf_counter() - start
        timings.append(elapsed)

    avg_time = statistics.mean(timings)
    return {
        "stage": "kafka_produce",
        "events": n_events,
        "runs": runs,
        "kafka_bootstrap": KAFKA_BOOTSTRAP,
        "topic": TOPIC,
        "avg_seconds": round(avg_time, 3),
        "min_seconds": round(min(timings), 3),
        "max_seconds": round(max(timings), 3),
        "throughput_eps": round(n_events / avg_time, 1),
    }


def benchmark_processing(n_events: int = 10000, runs: int = 3) -> dict:
    events = [generate_synthetic_event() for _ in range(n_events)]
    timings: list[float] = []

    for _ in range(runs):
        start = time.perf_counter()
        for event in events:
            transform_event_to_silver_row(event)
        elapsed = time.perf_counter() - start
        timings.append(elapsed)

    avg_time = statistics.mean(timings)
    return {
        "stage": "processing_transform",
        "events": n_events,
        "runs": runs,
        "avg_seconds": round(avg_time, 3),
        "min_seconds": round(min(timings), 3),
        "max_seconds": round(max(timings), 3),
        "throughput_eps": round(n_events / avg_time, 1),
    }


def benchmark_database_write(n_events: int = 5000, batch_size: int = 500, runs: int = 3) -> dict:
    if not _postgres_available():
        raise RuntimeError(f"Postgres not reachable at {DATABASE_URL}. Start Docker: make up")

    import psycopg2
    import psycopg2.extras

    events = [generate_synthetic_event() for _ in range(n_events)]
    rows = [transform_event_to_silver_row(e) for e in events]
    table = "_benchmark_shipments"

    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(BENCHMARK_TABLE_DDL)
        conn.commit()

        timings: list[float] = []
        insert_sql = SILVER_INSERT_SQL.format(table=table)

        for _ in range(runs):
            with conn.cursor() as cur:
                cur.execute(f"TRUNCATE {table}")
            conn.commit()

            start = time.perf_counter()
            with conn.cursor() as cur:
                for i in range(0, len(rows), batch_size):
                    batch = rows[i : i + batch_size]
                    psycopg2.extras.execute_batch(cur, insert_sql, batch, page_size=batch_size)
            conn.commit()
            elapsed = time.perf_counter() - start
            timings.append(elapsed)

        with conn.cursor() as cur:
            cur.execute(f"DROP TABLE IF EXISTS {table}")
        conn.commit()
    finally:
        conn.close()

    avg_time = statistics.mean(timings)
    return {
        "stage": "database_write",
        "events": n_events,
        "batch_size": batch_size,
        "runs": runs,
        "database": "local_docker_postgres",
        "avg_seconds": round(avg_time, 3),
        "min_seconds": round(min(timings), 3),
        "max_seconds": round(max(timings), 3),
        "throughput_eps": round(n_events / avg_time, 1),
    }


def benchmark_end_to_end(n_events: int = 5000, runs: int = 2) -> dict:
    """
    Full Python pipeline path: generate → Kafka produce → consume → transform → Postgres.

    Note: production also runs PySpark Structured Streaming (spark_processor.py) to Delta
    bronze on MinIO; that path requires Spark and is not included in this timer.
    """
    if not _kafka_available():
        raise RuntimeError(f"Kafka not reachable at {KAFKA_BOOTSTRAP}")
    if not _postgres_available():
        raise RuntimeError(f"Postgres not reachable at {DATABASE_URL}")

    from confluent_kafka import Consumer, KafkaError

    import psycopg2
    import psycopg2.extras
    from confluent_kafka.schema_registry import SchemaRegistryClient
    from confluent_kafka.schema_registry.avro import AvroDeserializer

    producer = _make_kafka_producer()
    table = "_benchmark_e2e_shipments"
    schema_str = Path(SCHEMA_PATH).read_text(encoding="utf-8")
    sr = SchemaRegistryClient({"url": SCHEMA_REGISTRY_URL})
    deserializer = AvroDeserializer(sr, schema_str)

    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(BENCHMARK_TABLE_DDL.replace("_benchmark_shipments", table))
        conn.commit()

        timings: list[float] = []
        insert_sql = SILVER_INSERT_SQL.format(table=table)

        for _ in range(runs):
            run_id = uuid.uuid4().hex[:8]
            group_id = f"benchmark-e2e-{run_id}"

            consumer = Consumer(
                {
                    "bootstrap.servers": KAFKA_BOOTSTRAP,
                    "group.id": group_id,
                    "auto.offset.reset": "latest",
                    "enable.auto.commit": False,
                }
            )
            consumer.subscribe([TOPIC])
            while not consumer.assignment():
                consumer.poll(0.5)

            start = time.perf_counter()

            for i in range(n_events):
                event = generate_synthetic_event()
                event["shipment_id"] = f"bench-{run_id}-{i:06d}"
                producer.produce(
                    TOPIC,
                    key=event["supplier_id"],
                    value=event,
                    headers=[("benchmark-run", run_id.encode())],
                )
                producer.poll(0)
            producer.flush(30)

            consumed: list[dict] = []
            prefix = f"bench-{run_id}-"
            deadline = time.perf_counter() + 120

            while len(consumed) < n_events and time.perf_counter() < deadline:
                msg = consumer.poll(0.5)
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    raise RuntimeError(msg.error())
                event = deserializer(msg.value(), None)
                if str(event.get("shipment_id", "")).startswith(prefix):
                    consumed.append(event)
            consumer.close()

            if len(consumed) < n_events:
                raise RuntimeError(f"E2E consume timeout: got {len(consumed)}/{n_events} events")

            silver_rows = [transform_event_to_silver_row(e) for e in consumed]

            with conn.cursor() as cur:
                cur.execute(f"TRUNCATE {table}")
                psycopg2.extras.execute_batch(cur, insert_sql, silver_rows, page_size=500)
            conn.commit()

            elapsed = time.perf_counter() - start
            timings.append(elapsed)

        with conn.cursor() as cur:
            cur.execute(f"DROP TABLE IF EXISTS {table}")
        conn.commit()
    finally:
        conn.close()

    avg_time = statistics.mean(timings)
    return {
        "stage": "end_to_end",
        "events": n_events,
        "runs": runs,
        "note": "Python Kafka consumer + EPA transform + Postgres; Spark bronze path excluded",
        "avg_seconds": round(avg_time, 3),
        "min_seconds": round(min(timings), 3),
        "max_seconds": round(max(timings), 3),
        "throughput_eps": round(n_events / avg_time, 1),
    }


def get_system_info() -> dict:
    import platform
    import shutil

    info = {
        "python_version": platform.python_version(),
        "os": platform.system(),
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor() or platform.machine(),
    }

    try:
        import multiprocessing

        info["cpu_count"] = multiprocessing.cpu_count()
    except Exception:
        pass

    try:
        total, _, _ = shutil.disk_usage("/")
        info["disk_total_gb"] = round(total / (1024**3), 1)
    except Exception:
        pass

    try:
        with open("/proc/meminfo", encoding="utf-8") as f:
            for line in f:
                if line.startswith("MemTotal"):
                    kb = int(line.split()[1])
                    info["memory_total_gb"] = round(kb / (1024**2), 1)
                    break
    except Exception:
        pass

    # macOS memory via sysctl when /proc/meminfo unavailable
    if "memory_total_gb" not in info:
        try:
            import subprocess

            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True).strip()
            info["memory_total_gb"] = round(int(out) / (1024**3), 1)
        except Exception:
            pass

    return info


def main() -> None:
    parser = argparse.ArgumentParser(description="Verdant Pipeline Benchmark")
    parser.add_argument("--events", type=int, default=10000, help="Events per benchmark (default: 10000)")
    parser.add_argument("--runs", type=int, default=3, help="Runs per stage for averaging (default: 3)")
    parser.add_argument(
        "--stages",
        nargs="+",
        choices=["generation", "kafka", "processing", "db", "e2e", "all"],
        default=["all"],
        help="Stages to benchmark (default: all)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="docs/benchmark_results.json",
        help="Output JSON path (default: docs/benchmark_results.json)",
    )
    args = parser.parse_args()

    stages = (
        args.stages
        if "all" not in args.stages
        else ["generation", "kafka", "processing", "db", "e2e"]
    )

    print("=" * 60)
    print("VERDANT PIPELINE BENCHMARK")
    print(f"Events per stage: {args.events:,}")
    print(f"Runs per stage: {args.runs}")
    print(f"Stages: {', '.join(stages)}")
    print("=" * 60)
    print()

    results: dict = {
        "benchmark_date": datetime.now(timezone.utc).isoformat(),
        "config": {
            "events_per_stage": args.events,
            "runs_per_stage": args.runs,
        },
        "system": get_system_info(),
        "environment": {
            "kafka_bootstrap": KAFKA_BOOTSTRAP,
            "database_url_host": DATABASE_URL.split("@")[-1].split("/")[0],
            "docker_required_stages": ["kafka", "db", "e2e"],
        },
        "stages": {},
        "errors": {},
    }

    stage_runners = {
        "generation": lambda: benchmark_event_generation(args.events, args.runs),
        "kafka": lambda: benchmark_kafka_produce(args.events, args.runs),
        "processing": lambda: benchmark_processing(args.events, args.runs),
        "db": lambda: benchmark_database_write(min(args.events, 5000), runs=args.runs),
        "e2e": lambda: benchmark_end_to_end(min(args.events, 5000), runs=min(args.runs, 2)),
    }

    labels = {
        "generation": "Event Generation",
        "kafka": "Kafka Produce",
        "processing": "Processing/Transform",
        "db": "Database Write",
        "e2e": "End-to-End Pipeline",
    }

    for stage in stages:
        print(f"Benchmarking: {labels[stage]}...")
        try:
            r = stage_runners[stage]()
            key = r["stage"]
            results["stages"][key] = r
            print(f"  → {r['throughput_eps']:,.0f} events/sec (avg {r['avg_seconds']}s)\n")
        except Exception as exc:
            results["errors"][stage] = str(exc)
            print(f"  → SKIPPED: {exc}\n")

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for stage_name, stage_data in results["stages"].items():
        print(f"  {stage_name:<25} {stage_data['throughput_eps']:>10,.0f} events/sec")

    if "end_to_end" in results["stages"]:
        e2e = results["stages"]["end_to_end"]
        events_per_hour = e2e["throughput_eps"] * 3600
        time_for_10m = 10_000_000 / e2e["throughput_eps"] / 3600
        results["extrapolation"] = {
            "events_per_hour": round(events_per_hour),
            "hours_for_10m_events": round(time_for_10m, 2),
        }
        print(f"\n  Extrapolated: {events_per_hour:,.0f} events/hour")
        print(f"  Time for 10M events: {time_for_10m:.1f} hours")

    if args.output != "/dev/null":
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"\nResults saved to {out_path}")
    else:
        print("\nResults not saved (--output /dev/null)")


if __name__ == "__main__":
    main()
