from __future__ import annotations

import json
from pathlib import Path
from typing import Optional
from uuid import UUID

import psycopg2.extras
from fastapi import APIRouter, HTTPException, Query

from db.connection import get_conn
from models import schemas

router = APIRouter(prefix="/pipeline", tags=["pipeline"])
REPO_ROOT = Path(__file__).resolve().parents[2]


@router.get("/status", response_model=schemas.PipelineStatusResponse)
def pipeline_status() -> schemas.PipelineStatusResponse:
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT component, status, last_heartbeat, records_processed, last_error
            FROM pipeline_status
            ORDER BY component
            """
        )
        rows = cur.fetchall()
        cur.execute(
            """
            SELECT COUNT(*)::int FROM shipment_silver_summary
            WHERE processing_timestamp >= NOW() - INTERVAL '1 hour'
            """
        )
        last_hour = int(cur.fetchone()["count"])
        cur.execute(
            "SELECT status, duration_seconds, models_run, tests_passed FROM dbt_run_metadata ORDER BY id DESC LIMIT 1"
        )
        dbt = cur.fetchone()
    comps = [
        schemas.PipelineComponent(
            name=r["component"],
            status=r["status"],
            last_heartbeat=schemas.iso(r["last_heartbeat"]),
            records_processed=int(r["records_processed"] or 0),
            last_error=r["last_error"],
        )
        for r in rows
    ]
    overall = "HEALTHY"
    for c in comps:
        if c.status == "DOWN":
            overall = "DOWN"
            break
        if c.status == "DEGRADED":
            overall = "DEGRADED"
    dbt_last = schemas.DbtLastRun(
        status=dbt["status"] if dbt else "UNKNOWN",
        duration_seconds=float(dbt["duration_seconds"] or 0) if dbt else 0.0,
        models_run=int(dbt["models_run"] or 0) if dbt else 0,
        tests_passed=int(dbt["tests_passed"] or 0) if dbt else 0,
    )
    return schemas.PipelineStatusResponse(
        components=comps,
        overall_status=overall,
        kafka_lag=0,
        records_last_hour=last_hour,
        dbt_last_run=dbt_last,
    )


@router.get("/alerts", response_model=list[schemas.EmissionsAlert])
def list_alerts(
    limit: int = Query(20, ge=1, le=200),
    severity: Optional[str] = Query(None),
) -> list[schemas.EmissionsAlert]:
    where = "WHERE acknowledged = FALSE"
    params: list = []
    if severity:
        where += " AND severity = %s"
        params.append(severity.upper())
    params.append(limit)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT alert_id::text, alert_type, severity, supplier_id, sku_id,
                   emissions_kg, threshold_kg, message, created_at, acknowledged
            FROM emissions_alerts
            {where}
            ORDER BY created_at DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = cur.fetchall()
    return [
        schemas.EmissionsAlert(
            alert_id=r["alert_id"],
            alert_type=r["alert_type"],
            severity=r["severity"],
            supplier_id=r["supplier_id"],
            sku_id=r["sku_id"],
            emissions_kg=float(r["emissions_kg"]) if r["emissions_kg"] is not None else None,
            threshold_kg=float(r["threshold_kg"]) if r["threshold_kg"] is not None else None,
            message=r["message"],
            created_at=schemas.iso(r["created_at"]),
            acknowledged=r["acknowledged"],
        )
        for r in rows
    ]


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id: str) -> dict:
    try:
        UUID(alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid alert id") from exc
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE emissions_alerts SET acknowledged=TRUE WHERE alert_id=%s RETURNING alert_id",
            (alert_id,),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Alert not found")
        conn.commit()
    return {"status": "ok", "alert_id": alert_id}


@router.get("/data-quality", response_model=dict)
def data_quality() -> dict:
    path = REPO_ROOT / "data_quality" / "last_run.json"
    if path.exists():
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    return {
        "last_run": None,
        "results": [],
        "note": "Run PYTHONPATH=. python data_quality/run_checks.py to populate",
    }
