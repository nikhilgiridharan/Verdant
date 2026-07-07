"""Emissions calculation tests (formula mirrors processing/silver_transformer.py)."""

from __future__ import annotations

import pytest

# EPA transport factors used in dashboard Scenario Engine and seed data (kg CO2e / tonne-km)
TRANSPORT_FACTORS = {"AIR": 0.5474, "OCEAN": 0.0233, "TRUCK": 0.092, "RAIL": 0.0077}


def calculate_emissions_kg(weight_kg: float, distance_km: float, mode: str) -> float:
    """Same formula as silver_transformer: (weight_kg/1000) * distance_km * factor."""
    if weight_kg < 0:
        raise ValueError("weight_kg must be non-negative")
    factor = TRANSPORT_FACTORS.get(mode.upper())
    if factor is None:
        raise ValueError(f"unknown transport mode: {mode}")
    return (weight_kg / 1000.0) * distance_km * factor


class TestEmissionsCalculation:
    def test_calculate_co2e_air(self):
        result = calculate_emissions_kg(1000, 500, "AIR")
        assert result > 0
        assert isinstance(result, float)
        assert result == pytest.approx(273.7, rel=1e-3)

    def test_calculate_co2e_ocean_lower_than_air(self):
        air = calculate_emissions_kg(1000, 10000, "AIR")
        ocean = calculate_emissions_kg(1000, 10000, "OCEAN")
        assert ocean < air

    def test_calculate_co2e_zero_distance(self):
        result = calculate_emissions_kg(1000, 0, "TRUCK")
        assert result == 0

    def test_calculate_co2e_zero_weight(self):
        result = calculate_emissions_kg(0, 500, "OCEAN")
        assert result == 0

    def test_calculate_co2e_negative_weight_raises(self):
        with pytest.raises(ValueError):
            calculate_emissions_kg(-100, 500, "OCEAN")

    def test_unknown_mode_raises(self):
        with pytest.raises(ValueError):
            calculate_emissions_kg(100, 100, "SUBMARINE")
