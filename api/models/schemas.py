from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

RiskTier = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
TransportMode = Literal["AIR", "OCEAN", "TRUCK", "RAIL"]
PipelineState = Literal["HEALTHY", "DEGRADED", "DOWN"]


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


class EmissionsSummary(BaseModel):
    total_co2_ytd_kg: float = Field(description="Year-to-date emissions kg CO2e")
    total_co2_mtd_kg: float = Field(description="Month-to-date emissions kg CO2e")
    total_shipments: int = Field(description="Shipment count in rolling window")
    active_suppliers: int = Field(description="Distinct suppliers with activity")
    avg_carbon_intensity: float = Field(description="Average kg CO2e per kg shipped")
    yoy_change_pct: float = Field(description="Approximate YoY change percentage")


class EmissionsTimeseriesPoint(BaseModel):
    date: str
    emissions_kg: float
    shipment_count: int


class TransportModeSlice(BaseModel):
    mode: str
    emissions_kg: float
    pct_of_total: float


class CountryEmissions(BaseModel):
    country: str
    lat: float
    lng: float
    emissions_kg: float
    supplier_count: int


class SupplierEmissionsDetail(BaseModel):
    supplier_id: str
    days: int
    total_emissions_kg: float
    shipment_count: int
    by_mode: list[TransportModeSlice]
    timeseries: list[EmissionsTimeseriesPoint]


class SkuEmissionsDetail(BaseModel):
    sku_id: str
    sku_name: Optional[str] = None
    product_category: Optional[str] = None
    total_emissions_kg: float
    suppliers: list[dict[str, Any]]


class SupplierListItem(BaseModel):
    supplier_id: str
    name: str
    country: str
    lat: float
    lng: float
    tier: int
    industry: Optional[str] = None
    risk_score: float
    risk_tier: str
    emissions_30d_kg: float
    emissions_trend: Optional[str] = None
    transport_modes: list[str]


class SupplierProfile(BaseModel):
    supplier_id: str
    name: str
    country: str
    lat: float
    lng: float
    tier: int
    industry: Optional[str] = None
    risk_score: float
    risk_tier: str
    emissions_monthly: list[EmissionsTimeseriesPoint]
    top_skus: list[dict[str, Any]]
    route_breakdown: list[dict[str, Any]]


class MapSupplier(BaseModel):
    supplier_id: str
    lat: float
    lng: float
    emissions_30d_kg: float
    risk_tier: str
    country: str
    name: str
    shipment_count: int


class RouteSegment(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    transport_mode: str
    emissions_kg: float
    active_shipments: int


class SkuListItem(BaseModel):
    sku_id: str
    sku_name: str
    product_category: str
    total_emissions_kg: float
    top_suppliers: list[dict[str, Any]]


class SankeyNode(BaseModel):
    id: str
    name: str
    type: str


class SankeyLink(BaseModel):
    source: str
    target: str
    value: float
    label: Optional[str] = None


class SankeyResponse(BaseModel):
    nodes: list[SankeyNode]
    links: list[SankeyLink]


class ForecastPoint(BaseModel):
    date: str
    predicted_kg: float
    lower_bound: float
    upper_bound: float


class ScenarioComparison(BaseModel):
    current_mode: dict[str, Any]
    alternative_mode: dict[str, Any]


class ForecastResponse(BaseModel):
    supplier_id: str
    horizon_days: int
    forecast: list[ForecastPoint]
    model_version: str
    scenario_comparison: ScenarioComparison


class PipelineComponent(BaseModel):
    name: str
    status: str
    last_heartbeat: Optional[str] = None
    records_processed: int = 0
    last_error: Optional[str] = None


class DbtLastRun(BaseModel):
    status: str
    duration_seconds: float
    models_run: int
    tests_passed: int


class PipelineStatusResponse(BaseModel):
    components: list[PipelineComponent]
    overall_status: str
    kafka_lag: int
    records_last_hour: int
    dbt_last_run: DbtLastRun


class EmissionsAlert(BaseModel):
    alert_id: str
    alert_type: str
    severity: str
    supplier_id: Optional[str] = None
    sku_id: Optional[str] = None
    emissions_kg: Optional[float] = None
    threshold_kg: Optional[float] = None
    message: Optional[str] = None
    created_at: str
    acknowledged: bool = False


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
