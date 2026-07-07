"""ML model stub tests — no trained artifacts required."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_ml_module(module_name: str, relative_path: str):
    spec = importlib.util.spec_from_file_location(module_name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_anomaly = _load_ml_module("ml_anomaly_detector", "ml/models/anomaly_detector.py")
_scorer = _load_ml_module("ml_supplier_risk_scorer", "ml/models/supplier_risk_scorer.py")
_forecaster = _load_ml_module("ml_emissions_forecaster", "ml/models/emissions_forecaster.py")

AnomalyDetector = _anomaly.AnomalyDetector
SupplierRiskScorer = _scorer.SupplierRiskScorer
EmissionsForecaster = _forecaster.EmissionsForecaster

VALID_TIERS = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


class TestSupplierRiskScorer:
    def test_score_supplier_returns_payload(self):
        scorer = SupplierRiskScorer()
        result = scorer.score_supplier("SUP-00001")
        assert result["supplier_id"] == "SUP-00001"
        assert 0 <= result["risk_score"] <= 1
        assert result["risk_tier"] in VALID_TIERS

    def test_score_is_deterministic(self):
        scorer = SupplierRiskScorer()
        a = scorer.score_supplier("SUP-00042")
        b = scorer.score_supplier("SUP-00042")
        a.pop("scored_at", None)
        b.pop("scored_at", None)
        assert a == b

    def test_different_suppliers_can_differ(self):
        scorer = SupplierRiskScorer()
        a = scorer.score_supplier("SUP-00001")
        b = scorer.score_supplier("SUP-99999")
        assert a["risk_score"] != b["risk_score"] or a["risk_tier"] != b["risk_tier"]

    def test_score_all_raises_not_implemented(self):
        scorer = SupplierRiskScorer()
        try:
            scorer.score_all_suppliers()
            assert False, "expected NotImplementedError"
        except NotImplementedError:
            pass


class TestAnomalyDetector:
    def test_detect_returns_float(self):
        detector = AnomalyDetector()
        score = detector.detect({"emissions_kg_co2e": 1200, "transport_mode": "AIR"})
        assert isinstance(score, float)

    def test_high_emissions_air_positive_score(self):
        detector = AnomalyDetector()
        score = detector.detect({"emissions_kg_co2e": 5000, "transport_mode": "AIR"})
        assert score > 0

    def test_low_emissions_negative_score(self):
        detector = AnomalyDetector()
        score = detector.detect({"emissions_kg_co2e": 10, "transport_mode": "OCEAN"})
        assert score < 0

    def test_missing_emissions_treated_as_zero(self):
        detector = AnomalyDetector()
        score = detector.detect({"transport_mode": "TRUCK"})
        assert isinstance(score, float)


class TestEmissionsForecaster:
    def test_forecast_returns_horizon_points(self):
        forecaster = EmissionsForecaster()
        result = forecaster.forecast("SUP-00001", horizon_days=30)
        assert result["supplier_id"] == "SUP-00001"
        assert len(result["forecast"]) == 30

    def test_forecast_point_shape(self):
        forecaster = EmissionsForecaster()
        point = forecaster.forecast("SUP-00002", horizon_days=5)["forecast"][0]
        assert "date" in point
        assert "predicted_kg" in point
        assert point["lower_bound"] <= point["predicted_kg"] <= point["upper_bound"]

    def test_forecast_non_negative_predictions(self):
        forecaster = EmissionsForecaster()
        pts = forecaster.forecast("SUP-00003", horizon_days=10)["forecast"]
        assert all(p["predicted_kg"] >= 0 for p in pts)
