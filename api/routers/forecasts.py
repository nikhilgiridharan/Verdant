from __future__ import annotations

from datetime import datetime, timedelta, timezone

import psycopg2.extras
from fastapi import APIRouter, HTTPException, Query

from db.connection import get_conn
from models import schemas

router = APIRouter(prefix="/forecasts", tags=["forecasts"])


def _stub_forecast(supplier_id: str, horizon_days: int) -> schemas.ForecastResponse:
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT COALESCE(AVG(daily),0) AS base FROM (
              SELECT date_trunc('day', event_at) AS d, SUM(emissions_kg_co2e) AS daily
              FROM shipment_silver_summary
              WHERE supplier_id=%s AND event_at >= NOW() - INTERVAL '120 days'
              GROUP BY 1
            ) q
            """,
            (supplier_id,),
        )
        base = float(cur.fetchone()["base"] or 1000.0)
        cur.execute(
            """
            SELECT transport_mode, SUM(emissions_kg_co2e) AS kg
            FROM shipment_silver_summary WHERE supplier_id=%s
            GROUP BY transport_mode ORDER BY kg DESC LIMIT 1
            """,
            (supplier_id,),
        )
        top = cur.fetchone()
    current_mode = top["transport_mode"] if top else "OCEAN"
    alt_mode = "OCEAN" if current_mode != "OCEAN" else "TRUCK"
    savings_pct = 35.0 if current_mode == "AIR" else 12.0
    now = datetime.now(timezone.utc).date()
    pts = []
    for i in range(horizon_days):
        d = now + timedelta(days=i + 1)
        trend = 1 + 0.001 * i
        pred = max(0.0, base * trend)
        band = pred * 0.15
        pts.append(
            schemas.ForecastPoint(
                date=d.isoformat(),
                predicted_kg=pred,
                lower_bound=max(0.0, pred - band),
                upper_bound=pred + band,
            )
        )
    total_current = base * horizon_days
    total_alt = total_current * (1 - savings_pct / 100.0)
    return schemas.ForecastResponse(
        supplier_id=supplier_id,
        horizon_days=horizon_days,
        forecast=pts,
        model_version="stub-1.0",
        scenario_comparison=schemas.ScenarioComparison(
            current_mode={"total_kg": total_current, "transport_mode": current_mode},
            alternative_mode={
                "total_kg": total_alt,
                "transport_mode": alt_mode,
                "savings_kg": total_current - total_alt,
                "savings_pct": savings_pct,
            },
        ),
    )


@router.get("/supplier/{supplier_id}", response_model=schemas.ForecastResponse)
def forecast_supplier(
    supplier_id: str,
    horizon: int = Query(30, description="Forecast horizon in days"),
) -> schemas.ForecastResponse:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM suppliers WHERE supplier_id=%s", (supplier_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Supplier not found")
    if horizon not in (30, 60, 90):
        raise HTTPException(status_code=400, detail="horizon must be 30, 60, or 90")
    return _stub_forecast(supplier_id, int(horizon))


@router.get("/platform", response_model=dict)
def forecast_platform(horizon: int = Query(90, ge=7, le=365)) -> dict:
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT COALESCE(AVG(daily),0) AS base FROM (
              SELECT date_trunc('day', event_at) AS d, SUM(emissions_kg_co2e) AS daily
              FROM shipment_silver_summary
              WHERE event_at >= NOW() - INTERVAL '180 days'
              GROUP BY 1
            ) q
            """
        )
        base = float(cur.fetchone()["base"] or 50000.0)
    now = datetime.now(timezone.utc).date()
    series = []
    for i in range(horizon):
        d = now + timedelta(days=i + 1)
        pred = max(0.0, base * (len(series) + 1) * 1.0005)
        series.append({"date": d.isoformat(), "predicted_kg": pred})
    return {"horizon_days": horizon, "forecast": series, "model_version": "stub-1.0"}
