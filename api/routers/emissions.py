from __future__ import annotations

from datetime import datetime, timedelta, timezone

import psycopg2.extras
from fastapi import APIRouter, Query

from db.connection import get_conn
from db.queries import granularity_sql, window_start
from models import schemas

router = APIRouter(prefix="/emissions", tags=["emissions"])


@router.get("/summary", response_model=schemas.EmissionsSummary)
def emissions_summary() -> schemas.EmissionsSummary:
    now = datetime.now(timezone.utc)
    y_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    m_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    yoy_start = y_start - timedelta(days=365)
    yoy_end = m_start - timedelta(days=365)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT COALESCE(SUM(emissions_kg_co2e),0) AS kg FROM shipment_silver_summary
            WHERE event_at >= %s
            """,
            (y_start,),
        )
        ytd = float(cur.fetchone()["kg"])
        cur.execute(
            """
            SELECT COALESCE(SUM(emissions_kg_co2e),0) AS kg FROM shipment_silver_summary
            WHERE event_at >= %s
            """,
            (m_start,),
        )
        mtd = float(cur.fetchone()["kg"])
        cur.execute(
            """
            SELECT COUNT(*)::int AS c, COUNT(DISTINCT supplier_id)::int AS s,
                   COALESCE(AVG(NULLIF(carbon_intensity,0)),0) AS a
            FROM shipment_silver_summary WHERE event_at >= %s
            """,
            (now - timedelta(days=90),),
        )
        row = cur.fetchone()
        cur.execute(
            """
            SELECT COALESCE(SUM(emissions_kg_co2e),0) AS kg FROM shipment_silver_summary
            WHERE event_at >= %s AND event_at < %s
            """,
            (yoy_start, yoy_end),
        )
        yoy_prev = float(cur.fetchone()["kg"] or 0)
        cur.execute(
            """
            SELECT COALESCE(SUM(emissions_kg_co2e),0) AS kg FROM shipment_silver_summary
            WHERE event_at >= %s AND event_at < %s
            """,
            (y_start, m_start),
        )
        yoy_curr_window = float(cur.fetchone()["kg"] or 0)
    yoy_change = 0.0
    if yoy_prev > 0:
        yoy_change = (yoy_curr_window - yoy_prev) / yoy_prev * 100.0
    return schemas.EmissionsSummary(
        total_co2_ytd_kg=ytd,
        total_co2_mtd_kg=mtd,
        total_shipments=int(row["c"]),
        active_suppliers=int(row["s"]),
        avg_carbon_intensity=float(row["a"]),
        yoy_change_pct=yoy_change,
    )


@router.get("/timeseries", response_model=list[schemas.EmissionsTimeseriesPoint])
def emissions_timeseries(
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    days: int = Query(90, ge=1, le=730),
) -> list[schemas.EmissionsTimeseriesPoint]:
    start = window_start(days)
    trunc = granularity_sql(granularity)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT date_trunc(%s, event_at AT TIME ZONE 'UTC')::date AS d,
                   SUM(emissions_kg_co2e) AS emissions_kg,
                   COUNT(*)::int AS shipment_count
            FROM shipment_silver_summary
            WHERE event_at >= %s
            GROUP BY 1 ORDER BY 1
            """,
            (trunc, start),
        )
        rows = cur.fetchall()
    return [
        schemas.EmissionsTimeseriesPoint(
            date=str(r["d"]),
            emissions_kg=float(r["emissions_kg"] or 0),
            shipment_count=int(r["shipment_count"]),
        )
        for r in rows
    ]


@router.get("/by-transport-mode", response_model=list[schemas.TransportModeSlice])
def by_transport_mode(days: int = Query(90, ge=1, le=365)) -> list[schemas.TransportModeSlice]:
    start = window_start(days)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT transport_mode, SUM(emissions_kg_co2e) AS kg
            FROM shipment_silver_summary WHERE event_at >= %s
            GROUP BY transport_mode
            """,
            (start,),
        )
        rows = cur.fetchall()
    total = sum(float(r["kg"] or 0) for r in rows) or 1.0
    return [
        schemas.TransportModeSlice(
            mode=r["transport_mode"],
            emissions_kg=float(r["kg"] or 0),
            pct_of_total=float(r["kg"] or 0) / total * 100.0,
        )
        for r in rows
    ]


@router.get("/by-country", response_model=list[schemas.CountryEmissions])
def by_country(days: int = Query(90, ge=1, le=365)) -> list[schemas.CountryEmissions]:
    start = window_start(days)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT s.supplier_country AS country,
                   AVG(sup.lat)::float AS lat,
                   AVG(sup.lng)::float AS lng,
                   SUM(s.emissions_kg_co2e) AS emissions_kg,
                   COUNT(DISTINCT s.supplier_id)::int AS supplier_count
            FROM shipment_silver_summary s
            JOIN suppliers sup ON sup.supplier_id = s.supplier_id
            WHERE s.event_at >= %s AND s.supplier_country IS NOT NULL
            GROUP BY s.supplier_country
            ORDER BY emissions_kg DESC
            """,
            (start,),
        )
        rows = cur.fetchall()
    return [
        schemas.CountryEmissions(
            country=r["country"],
            lat=float(r["lat"] or 0),
            lng=float(r["lng"] or 0),
            emissions_kg=float(r["emissions_kg"] or 0),
            supplier_count=int(r["supplier_count"]),
        )
        for r in rows
    ]


@router.get("/supplier/{supplier_id}", response_model=schemas.SupplierEmissionsDetail)
def supplier_emissions(supplier_id: str, days: int = 30) -> schemas.SupplierEmissionsDetail:
    start = window_start(days)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT COALESCE(SUM(emissions_kg_co2e),0) AS total, COUNT(*)::int AS c
            FROM shipment_silver_summary WHERE supplier_id=%s AND event_at >= %s
            """,
            (supplier_id, start),
        )
        agg = cur.fetchone()
        cur.execute(
            """
            SELECT transport_mode, SUM(emissions_kg_co2e) AS kg
            FROM shipment_silver_summary WHERE supplier_id=%s AND event_at >= %s
            GROUP BY transport_mode
            """,
            (supplier_id, start),
        )
        modes = cur.fetchall()
        total_m = sum(float(r["kg"] or 0) for r in modes) or 1.0
        cur.execute(
            """
            SELECT date_trunc('day', event_at)::date AS d,
                   SUM(emissions_kg_co2e) AS emissions_kg,
                   COUNT(*)::int AS shipment_count
            FROM shipment_silver_summary
            WHERE supplier_id=%s AND event_at >= %s
            GROUP BY 1 ORDER BY 1
            """,
            (supplier_id, start),
        )
        ts = cur.fetchall()
    return schemas.SupplierEmissionsDetail(
        supplier_id=supplier_id,
        days=days,
        total_emissions_kg=float(agg["total"]),
        shipment_count=int(agg["c"]),
        by_mode=[
            schemas.TransportModeSlice(
                mode=r["transport_mode"],
                emissions_kg=float(r["kg"] or 0),
                pct_of_total=float(r["kg"] or 0) / total_m * 100.0,
            )
            for r in modes
        ],
        timeseries=[
            schemas.EmissionsTimeseriesPoint(
                date=str(r["d"]),
                emissions_kg=float(r["emissions_kg"] or 0),
                shipment_count=int(r["shipment_count"]),
            )
            for r in ts
        ],
    )


@router.get("/sku/{sku_id}", response_model=schemas.SkuEmissionsDetail)
def sku_emissions(sku_id: str) -> schemas.SkuEmissionsDetail:
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT name, category FROM skus WHERE sku_id=%s", (sku_id,))
        meta = cur.fetchone()
        cur.execute(
            """
            SELECT supplier_id, SUM(emissions_kg_co2e) AS kg
            FROM shipment_silver_summary WHERE sku_id=%s
            GROUP BY supplier_id ORDER BY kg DESC LIMIT 10
            """,
            (sku_id,),
        )
        sups = cur.fetchall()
        cur.execute(
            "SELECT COALESCE(SUM(emissions_kg_co2e),0) FROM shipment_silver_summary WHERE sku_id=%s",
            (sku_id,),
        )
        total = float(cur.fetchone()["coalesce"])
    suppliers = [{"supplier_id": r["supplier_id"], "emissions_kg": float(r["kg"] or 0)} for r in sups]
    return schemas.SkuEmissionsDetail(
        sku_id=sku_id,
        sku_name=meta["name"] if meta else None,
        product_category=meta["category"] if meta else None,
        total_emissions_kg=total,
        suppliers=suppliers,
    )
