from __future__ import annotations

from typing import Optional

import psycopg2.extras
from fastapi import APIRouter, HTTPException, Query

from db.connection import get_conn
from models import schemas

router = APIRouter(prefix="/skus", tags=["skus"])


@router.get("", response_model=dict)
def list_skus(
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    where = ""
    params: list = []
    if category:
        where = "WHERE k.category = %s"
        params.append(category)
    params.append(limit)
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT k.sku_id, k.name AS sku_name, k.category AS product_category,
                   COALESCE(SUM(s.emissions_kg_co2e),0) AS total_emissions_kg
            FROM skus k
            LEFT JOIN shipment_silver_summary s ON s.sku_id = k.sku_id
            {where}
            GROUP BY k.sku_id, k.name, k.category
            ORDER BY total_emissions_kg DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = cur.fetchall()
    items = []
    for r in rows:
        with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur2:
            cur2.execute(
                """
                SELECT supplier_id, SUM(emissions_kg_co2e) AS kg
                FROM shipment_silver_summary WHERE sku_id=%s
                GROUP BY supplier_id ORDER BY kg DESC LIMIT 3
                """,
                (r["sku_id"],),
            )
            tops = [{"supplier_id": t["supplier_id"], "emissions_kg": float(t["kg"] or 0)} for t in cur2.fetchall()]
        items.append(
            schemas.SkuListItem(
                sku_id=r["sku_id"],
                sku_name=r["sku_name"],
                product_category=r["product_category"],
                total_emissions_kg=float(r["total_emissions_kg"] or 0),
                top_suppliers=tops,
            ).model_dump()
        )
    return {"items": items, "limit": limit}


@router.get("/{sku_id}/sankey", response_model=schemas.SankeyResponse)
def sku_sankey(sku_id: str) -> schemas.SankeyResponse:
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT sku_id, name, category FROM skus WHERE sku_id=%s", (sku_id,))
        sku = cur.fetchone()
        if not sku:
            raise HTTPException(status_code=404, detail="SKU not found")
        cur.execute(
            """
            SELECT s.supplier_id, sup.name AS supplier_name,
                   s.transport_mode, SUM(s.emissions_kg_co2e) AS kg,
                   COALESCE(r.risk_tier,'LOW') AS risk_tier
            FROM shipment_silver_summary s
            JOIN suppliers sup ON sup.supplier_id = s.supplier_id
            LEFT JOIN supplier_risk_scores r ON r.supplier_id = s.supplier_id
            WHERE s.sku_id=%s
            GROUP BY s.supplier_id, sup.name, s.transport_mode, r.risk_tier
            ORDER BY kg DESC
            LIMIT 40
            """,
            (sku_id,),
        )
        flows = cur.fetchall()
    nodes: dict[str, schemas.SankeyNode] = {}
    links: list[schemas.SankeyLink] = []

    sku_node = f"sku:{sku_id}"
    nodes[sku_node] = schemas.SankeyNode(id=sku_node, name=sku["name"], type="sku")

    for f in flows:
        sup_id = f["supplier_id"]
        mode = f["transport_mode"]
        sup_node = f"supplier:{sup_id}"
        mode_node = f"mode:{mode}"
        if sup_node not in nodes:
            nodes[sup_node] = schemas.SankeyNode(
                id=sup_node,
                name=f["supplier_name"],
                type="supplier",
            )
        if mode_node not in nodes:
            nodes[mode_node] = schemas.SankeyNode(id=mode_node, name=mode, type="transport")
        val = float(f["kg"] or 0)
        links.append(
            schemas.SankeyLink(
                source=sup_node,
                target=mode_node,
                value=val,
                label=f["risk_tier"],
            )
        )
        links.append(
            schemas.SankeyLink(
                source=mode_node,
                target=sku_node,
                value=val,
                label=mode,
            )
        )
    return schemas.SankeyResponse(nodes=list(nodes.values()), links=links)
