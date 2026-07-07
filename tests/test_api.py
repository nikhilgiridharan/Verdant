"""API endpoint tests with mocked database."""

from __future__ import annotations

from datetime import datetime, timezone


def _summary_row() -> dict:
    return {
        "ytd_kg": 125000.0,
        "mtd_kg": 12000.0,
        "shipments_90d": 450,
        "suppliers_90d": 38,
        "avg_intensity_90d": 0.42,
        "yoy_prev_kg": 100000.0,
        "yoy_curr_window_kg": 95000.0,
    }


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self, client):
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "timestamp" in data


class TestEmissionsEndpoints:
    def test_emissions_summary_returns_200(self, client, mock_get_conn):
        with mock_get_conn([("one", _summary_row())]):
            response = client.get("/api/v1/emissions/summary")
        assert response.status_code == 200

    def test_emissions_summary_response_shape(self, client, mock_get_conn):
        with mock_get_conn([("one", _summary_row())]):
            data = client.get("/api/v1/emissions/summary").json()
        assert "total_co2_ytd_kg" in data
        assert "active_suppliers" in data
        assert data["total_co2_ytd_kg"] == 125000.0

    def test_emissions_timeseries_returns_list(self, client, mock_get_conn):
        rows = [
            {"d": datetime(2026, 1, 1, tzinfo=timezone.utc).date(), "emissions_kg": 100.0, "shipment_count": 5},
            {"d": datetime(2026, 1, 2, tzinfo=timezone.utc).date(), "emissions_kg": 120.0, "shipment_count": 6},
        ]
        with mock_get_conn([("all", rows)]):
            response = client.get("/api/v1/emissions/timeseries?granularity=day&days=30")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) == 2

    def test_emissions_timeseries_invalid_granularity_422(self, client):
        response = client.get("/api/v1/emissions/timeseries?granularity=year")
        assert response.status_code == 422


class TestSuppliersEndpoints:
    def test_list_suppliers_returns_200(self, client, mock_get_conn):
        supplier_rows = [
            {
                "supplier_id": "SUP-00001",
                "name": "Acme Corp",
                "country": "CN",
                "lat": 31.2,
                "lng": 121.5,
                "tier": 1,
                "industry": "Electronics",
                "risk_score": 0.4,
                "risk_tier": "MEDIUM",
                "emissions_30d_kg": 5000.0,
                "emissions_trend": "STABLE",
                "transport_modes": ["AIR"],
            }
        ]
        with mock_get_conn([("all", supplier_rows), ("one", {"c": 1})]):
            response = client.get("/api/v1/suppliers?limit=10")
        assert response.status_code == 200

    def test_list_suppliers_response_structure(self, client, mock_get_conn):
        with mock_get_conn([("all", []), ("one", {"c": 0})]):
            data = client.get("/api/v1/suppliers?limit=5").json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)


class TestPipelineEndpoints:
    def test_pipeline_status_returns_200(self, client, mock_get_conn):
        now = datetime.now(timezone.utc)
        script = [
            (
                "all",
                [
                    {
                        "component": "api",
                        "status": "HEALTHY",
                        "last_heartbeat": now,
                        "records_processed": 0,
                        "last_error": None,
                    }
                ],
            ),
            ("one", {"count": 12}),
            ("one", {"status": "SUCCESS", "duration_seconds": 10.0, "models_run": 5, "tests_passed": 5}),
        ]
        with mock_get_conn(script):
            response = client.get("/api/v1/pipeline/status")
        assert response.status_code == 200
        body = response.json()
        assert "components" in body
        assert body["overall_status"] in ("HEALTHY", "DEGRADED", "DOWN")


class TestForecastEndpoints:
    def test_forecast_supplier_returns_200(self, client, mock_get_conn):
        script = [
            ("all", []),
            ("one", (0.0, 0.0)),
        ]
        with mock_get_conn(script):
            response = client.get("/api/v1/forecasts/supplier/SUP-00001?horizon=30")
        assert response.status_code == 200
        data = response.json()
        assert data["supplier_id"] == "SUP-00001"
        assert "forecast" in data or "historical" in data


class TestEmissionsBreakdownEndpoints:
    def test_by_transport_mode(self, client, mock_get_conn):
        rows = [{"transport_mode": "AIR", "kg": 5000.0}]
        with mock_get_conn([("all", rows)]):
            response = client.get("/api/v1/emissions/by-transport-mode?days=90")
        assert response.status_code == 200
        assert response.json()[0]["mode"] == "AIR"

    def test_by_country(self, client, mock_get_conn):
        rows = [
            {
                "country": "CN",
                "lat": 35.0,
                "lng": 105.0,
                "emissions_kg": 8000.0,
                "supplier_count": 3,
            }
        ]
        with mock_get_conn([("all", rows)]):
            response = client.get("/api/v1/emissions/by-country?days=90")
        assert response.status_code == 200
        assert response.json()[0]["country"] == "CN"

    def test_decarbonization_pathway(self, client, mock_get_conn):
        air_rows = [
            {
                "supplier_id": "SUP-00001",
                "supplier_name": "Acme",
                "country": "CN",
                "transport_mode": "AIR",
                "mode_emissions": 10000.0,
                "avg_weight_kg": 1000.0,
                "avg_distance_km": 10000.0,
                "shipment_count": 5,
            }
        ]
        with mock_get_conn([("one", {"total_emissions": 50000.0}), ("all", air_rows)]):
            response = client.get("/api/v1/emissions/decarbonization-pathway?target_reduction_pct=20")
        assert response.status_code == 200
        body = response.json()
        assert "pathway" in body
        assert "achievable" in body
